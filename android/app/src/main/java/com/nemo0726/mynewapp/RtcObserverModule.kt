package com.nemo0726.mynewapp

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.sqrt
import android.media.audiofx.Visualizer
import    android.media.MediaPlayer

private data class DataChunk(val bytes: ByteArray, val sr: Int, val ch: Int)

class RtcObserverModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "RtcObserverModule"

        private var outputVisualizer: Visualizer? = null

        // 큐에 DataChunk 저장 (thread-safe)
        private val queued: ConcurrentLinkedQueue<DataChunk> = ConcurrentLinkedQueue()

        @Volatile
        private var instance: RtcObserverModule? = null

        @Volatile
        private var isSubscribed = false

        private const val MAX_QUEUE_SIZE = 50

        /**
         * 네이티브에서 호출: 샘플 바이트를 그대로 전달.
         * 큐잉(copy) 하므로 원본 바이트가 변경되어도 안전합니다.
         */
        @JvmStatic
        fun emitInputEnvelopeFromNative(bytes: ByteArray, sr: Int, ch: Int) {
            if (!isSubscribed) {
                Log.d(TAG, "구독 중이 아니므로 데이터 무시")
                return // 구독 상태가 아니면 데이터 버림
            }
            if (queued.size >= MAX_QUEUE_SIZE) {
                queued.poll() // 가장 오래된 데이터 제거
            }

            val mod = instance
            // 복사해서 큐에 넣음(안전)
            val copy = bytes.copyOf()
            if (mod == null) {
                Log.d(
                    TAG,
                    "emitInputEnvelopeFromNative: module not ready, enqueue bytes=${copy.size} sr=$sr ch=$ch"
                )
                queued.add(DataChunk(copy, sr, ch))
                return
            }
            // 인스턴스가 있으면 바로 처리
            mod.computeAndEmitEnvelope(copy, sr, ch)
        }
    }

    init {
        Log.d(TAG, "init() called, setting instance")
        instance = this
        flushQueueIfNeeded()
    }

    override fun getName(): String = "RtcObserver"

    // RN >=0.65 requirement (no-op)
    @ReactMethod
    fun addListener(eventName: String) {
        isSubscribed = true
        Log.d(TAG, "Listener added - 큐 활성화")
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        isSubscribed = false
        queued.clear()
        releaseOutputVisualizer()
        Log.d(TAG, "Listeners removed - 큐 비활성화 및 클리어")
    }

    // JS에서 테스트용으로 호출 가능
    @ReactMethod
    fun testEmitInputEnvelope() {
        Log.d(TAG, "testEmitInputEnvelope called from JS")
        // 간단한 더미 신호 전송 (예: 960바이트, 480샘플의 16-bit PCM)
        val sampleCount = 480
        val bytes = ByteArray(sampleCount * 2)
        // fill with small sine-ish pattern for visual
        for (i in 0 until sampleCount) {
            val v = ((Math.sin(i.toDouble() * 0.1) * 0.5) * 32767).toInt().toShort()
            val off = i * 2
            bytes[off] = (v.toInt() and 0xFF).toByte()
            bytes[off + 1] = ((v.toInt() shr 8) and 0xFF).toByte()
        }
        computeAndEmitEnvelope(bytes, 48000, 1)
    }

    private fun flushQueueIfNeeded() {
        val mod = instance ?: return
        if (!isSubscribed) {
            queued.clear() // 구독 상태가 아니면 큐 클리어
            return
        }
        if (queued.isNotEmpty()) {
            Log.d(TAG, "flushQueueIfNeeded: flushing ${queued.size} items")
            while (queued.isNotEmpty()) {
                val item = queued.poll() ?: continue
                mod.computeAndEmitEnvelope(item.bytes, item.sr, item.ch)
            }
        }
    }

    /**
     * bytes: PCM 16-bit little-endian
     * sr: sample rate
     * ch: channel count (mono assumed for envelope calc)
     *
     * 결과는 RN 이벤트 "RtcInputEnvelope" 로 보냄:
     * { envelope: number[], sr: number, ch: number }
     */
    fun computeAndEmitEnvelope(bytes: ByteArray, sr: Int, ch: Int) {
        if (bytes.isEmpty()) return

        try {
            // 16-bit little-endian -> ShortBuffer 변환
            val shortBuf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
            val totalSamples = shortBuf.limit() // 총 샘플 수 (모노로 가정)
            if (totalSamples <= 0) return

            // samplesPerBlock: 한 이벤트에 포함할 샘플 수(조절 가능)
            // 여기서는 bytes가 보통 960바이트(=480샘플) 정도 오므로, 블록 수를 8로 나눔.
            val defaultBlockCount = 8
            val samplesPerBlock = maxOf(1, totalSamples / defaultBlockCount)

            val arr: WritableArray = WritableNativeArray()

            var i = 0
            while (i < totalSamples) {
                val end = min(i + samplesPerBlock, totalSamples)
                var maxAbs = 0
                var sumSq = 0.0
                for (j in i until end) {
                    val s = shortBuf.get(j).toInt()
                    val absS = abs(s)
                    if (absS > maxAbs) maxAbs = absS
                    sumSq += (s.toDouble() * s.toDouble())
                }
                val peak = maxAbs / 32768.0 // 0..1
                val rms = sqrt(sumSq / (end - i)) / 32768.0
                // push peak (또는 rms를 원하면 pushDouble(rms))
                arr.pushDouble(peak)
                i = end
            }

            // RN으로 전송
            val map = Arguments.createMap().apply {
                putArray("envelope", arr)
                putInt("sr", sr)
                putInt("ch", ch)
            }
            Log.d(
                TAG,
                "computeAndEmitEnvelope -> emitting envelope size=${arr.size()} sr=$sr ch=$ch"
            )
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("RtcInputEnvelope", map)

        } catch (t: Throwable) {
            Log.w(TAG, "computeAndEmitEnvelope failure", t)
        }
    }

    override fun onCatalystInstanceDestroy() {
        queued.clear()
        releaseOutputVisualizer()
    }

    /** 웹RTC 오디오 출력 시각화 설정 */
    @ReactMethod
    fun setupOutputVisualizer() {
        val activity = currentActivity ?: run {
            Log.e(TAG, "No current activity for permission request")
            return
        }
        if (activity !is MainActivity) {
            Log.w(TAG, "setupOutputVisualizer: activity is not MainActivity")
            return
        }
        releaseOutputVisualizer() // 기존 Visualizer 정리

        try {
            Log.d(TAG, "trying init Output Visualizer")
            val visualizer = Visualizer(0)
            Log.d(TAG, "trying init Output Visualizer 2")
            visualizer.captureSize = Visualizer.getCaptureSizeRange()[1]

            visualizer.setDataCaptureListener(
                object : Visualizer.OnDataCaptureListener {
                    override fun onWaveFormDataCapture(
                        visualizer: Visualizer,
                        waveform: ByteArray,
                        samplingRate: Int
                    ) {
                        processOutputWaveform(waveform, samplingRate)
                    }

                    override fun onFftDataCapture(
                        visualizer: Visualizer,
                        fft: ByteArray,
                        samplingRate: Int
                    ) {
                        // FFT 데이터 사용 안 함
                    }
                },
                Visualizer.getMaxCaptureRate() / 2, // 초당 약 10-15회
                true, // 파형 데이터 캡처
                false // FFT 데이터 미사용
            )

            visualizer.enabled = true
            outputVisualizer = visualizer
            Log.d(TAG, "Output Visualizer initialized for session")
        } catch (e: Exception) {
            Log.e(TAG, "Visualizer setup failed", e)
        }
    }

    /** 출력 오디오 파형 처리 */
    private fun processOutputWaveform(waveform: ByteArray, samplingRate: Int) {
        if (waveform.isEmpty()) {
            Log.w(TAG, "processOutputWaveform waveform is empty")
            return
        }

        try {
            Log.d(TAG, "processOutputWaveform size=${waveform.size}")
            val outputScaleFactor = 0.5f
            // Visualizer의 waveform 데이터는 8비트 부호 없는 형식 (0~255)
            val envelopeValues = mutableListOf<Double>()
            val blockSize = waveform.size / 8 // 8개 블록으로 분할

            for (i in 0 until 8) {
                val start = i * blockSize
                val end = min(start + blockSize, waveform.size)
                var maxValue = 0.0

                for (j in start until end) {
                    // 파형 데이터를 -128~127 범위로 변환 후 절대값 계산
                    val value = abs((waveform[j].toInt() and 0xFF) - 128) / 128.0
                    if (value > maxValue) maxValue = value
                }
                val scaledValue = maxValue * outputScaleFactor

                envelopeValues.add(scaledValue)
            }

            emitOutputEnvelope(envelopeValues, samplingRate)
        } catch (e: Exception) {
            Log.e(TAG, "processOutputWaveform failure", e)
        }
    }

    /** 출력 엔벨로프 이벤트 발생 */
    private fun emitOutputEnvelope(envelope: List<Double>, samplingRate: Int) {
        val arr: WritableArray = WritableNativeArray()
        envelope.forEach { arr.pushDouble(it) }

        val map = Arguments.createMap().apply {
            putArray("envelope", arr)
            putInt("sr", samplingRate)
            putInt("ch", 1) // 출력은 항상 모노
        }

        //log first 8
        Log.d(
            TAG,
            "emitOutputEnvelope, first 8: ${envelope.take(8)} sr=$samplingRate ch=1"
        )
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("RtcOutputEnvelope", map)
    }

    /** Visualizer 리소스 해제 */
    private fun releaseOutputVisualizer() {
        outputVisualizer?.apply {
            enabled = false
            release()
            outputVisualizer = null
            Log.d(TAG, "Output Visualizer released")
        }
    }
}
