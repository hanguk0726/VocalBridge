package com.nemo0726.mynewapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.media.audiofx.Visualizer
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

import com.oney.WebRTCModule.WebRTCModuleOptions

import expo.modules.ReactActivityDelegateWrapper
import expo.modules.splashscreen.SplashScreenManager

import org.webrtc.audio.JavaAudioDeviceModule


import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.sqrt

class MainActivity : ReactActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var inputObserveThread: HandlerThread
    private lateinit var inputObserveHandler: Handler


    override fun onCreate(savedInstanceState: Bundle?) {
        //ADDED
        // 1) 워커 스레드 생성
        inputObserveThread = HandlerThread("RtcInputObserve").apply { start() }
        inputObserveHandler = Handler(inputObserveThread.looper)

        // 2) WebRTCModule 옵션
        val options = WebRTCModuleOptions.getInstance()

        // 3) AudioAttributes
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()

        // 4) 샘플 콜백 정의
        val samplesCallback = JavaAudioDeviceModule.SamplesReadyCallback { samples ->

            inputObserveHandler.post {
                try {
                    Log.d(
                        TAG,
                        "Samples callback invoked. sampleRate=${samples.sampleRate}, channelCount=${samples.channelCount}"
                    )

                    val data = samples.data
                    Log.d(TAG, "samples.data class=${data?.javaClass?.name ?: "null"}")

                    // 상세 타입/길이 로깅
                    when (data) {
                        is ShortArray -> Log.d(TAG, "ShortArray length=${data.size}")
                        is ByteArray -> Log.d(TAG, "ByteArray length=${data.size}")
                        is ByteBuffer -> Log.d(
                            TAG,
                            "ByteBuffer remaining=${data.duplicate().remaining()}"
                        )

                        else -> Log.d(TAG, "Unknown sample data type")
                    }

                    // 안전한 변환 (ByteBuffer는 rewind)
                    val bytes: ByteArray = when (val d = data) {
                        is ShortArray -> {
                            val out = ByteArray(d.size * 2)
                            ByteBuffer.wrap(out).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                                .put(d)
                            out
                        }

                        is ByteArray -> {
                            // 바로 복사
                            if (d.isEmpty()) {
                                ByteArray(0)
                            } else {
                                d.copyOf()
                            }
                        }

                        is ByteBuffer -> {
                            val bb = d.duplicate().order(ByteOrder.LITTLE_ENDIAN)
                            if (bb.position() != 0) bb.rewind()
                            val out = ByteArray(bb.remaining())
                            bb.get(out)
                            out
                        }

                        else -> ByteArray(0)
                    }

                    // 샘플 요약 (최초 몇 바이트만 출력)
                    if (bytes.isNotEmpty()) {
                        val previewLen = minOf(bytes.size, 8)
                        val preview = bytes.take(previewLen)
                            .joinToString(",") { (it.toInt() and 0xFF).toString() }
                        Log.d(
                            TAG,
                            "Captured ${bytes.size} bytes (preview first $previewLen): [$preview]"
                        )
                    } else {
                        Log.d(
                            TAG,
                            "Captured 0 bytes, SR=${samples.sampleRate}, CH=${samples.channelCount}"
                        )
                    }

                    // 안전하게 RN으로 전송 (NPE safe)
                    if (bytes.isNotEmpty()) {
                        RtcObserverModule.emitInputEnvelopeFromNative(
                            bytes,
                            samples.sampleRate,
                            samples.channelCount
                        )
                    }
                } catch (t: Throwable) {
                    Log.w(TAG, "observe failure", t)
                }
            }
        }


        // 6) ADM 생성
        val adm = JavaAudioDeviceModule.builder(this)
            .setAudioAttributes(audioAttributes)
            .setAudioSource(MediaRecorder.AudioSource.MIC)
            .setUseHardwareAcousticEchoCanceler(true)
            .setUseHardwareNoiseSuppressor(true)
            .apply {
                try {
                    setSamplesReadyCallback(samplesCallback)
                } catch (t: Throwable) {
                    Log.e(TAG, "SamplesReadyCallback not available", t)
                }
            }
            .createAudioDeviceModule()

        // 7) 옵션에 ADM 주입
        options.audioDeviceModule = adm
        // ENDED


        // Set the theme to AppTheme BEFORE onCreate to support
        // coloring the background, status bar, and navigation bar.
        // This is required for expo-splash-screen.
        // setTheme(R.style.AppTheme);
        // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
        SplashScreenManager.registerOnActivity(this)
        // @generated end expo-splashscreen
        super.onCreate(null)
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "main"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {})
    }

    /**
     * Align the back button behavior with Android S
     * where moving root activities to background instead of finishing activities.
     * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
     */
    override fun invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                // For non-root activities, use the default implementation to finish them.
                super.invokeDefaultOnBackPressed()
            }
            return
        }

        // Use the default back button implementation on Android S
        // because it's doing more than [Activity.moveTaskToBack] in fact.
        super.invokeDefaultOnBackPressed()
    }
}
