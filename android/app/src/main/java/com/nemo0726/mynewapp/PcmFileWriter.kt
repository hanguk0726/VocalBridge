package com.nemo0726.mynewapp
//
//// 테스트를 위한 유틸 코드
//import android.content.Context
//import android.util.Log
//import java.io.*
//
//object PcmFileWriter {
//    private const val TAG = "PcmFileWriter"
//
//    private var pcmFile: File? = null
//    private var pcmOut: BufferedOutputStream? = null
//    private var sampleRate = 48000
//    private var channels = 1
//    private var bytesPerSample = 2 // 16-bit
//
//    // 초기화: context, 샘플레이트, 채널 수, 임시 파일명(optional)
//    fun init(context: Context, sr: Int, ch: Int, tmpName: String = "capture_raw.pcm") {
//        sampleRate = sr
//        channels = ch
//        bytesPerSample = 2
//
//        val dir = context.getExternalFilesDir(null) // 앱 전용 외부 폴더 (권한 불필요)
//        if (dir == null) {
//            Log.w(TAG, "external files dir is null")
//            return
//        }
//        pcmFile = File(dir, tmpName)
//        // 기존 파일 있으면 삭제 후 새로 생성
//        if (pcmFile!!.exists()) pcmFile!!.delete()
//        try {
//            pcmOut = BufferedOutputStream(FileOutputStream(pcmFile!!, true))
//            Log.d(TAG, "PcmFileWriter.init -> file=${pcmFile!!.absolutePath}")
//        } catch (e: IOException) {
//            Log.w(TAG, "PcmFileWriter init failed", e)
//            pcmOut = null
//        }
//    }
//
//    // 바이트 추가 (handler thread에서 호출하는 것을 권장)
//    fun append(bytes: ByteArray) {
//        try {
//            pcmOut?.write(bytes)
//            Log.d(TAG, "append ${bytes.size} bytes")
//        } catch (e: IOException) {
//            Log.w(TAG, "append failed", e)
//        }
//    }
//
//    // 스트림 flush & close (이후 WAV 생성 가능)
//    fun closePcm() {
//        try {
//            pcmOut?.flush()
//            pcmOut?.close()
//            pcmOut = null
//            Log.d(TAG, "PcmFileWriter.closePcm -> closed")
//        } catch (e: IOException) {
//            Log.w(TAG, "close pcm failed", e)
//        }
//    }
//
//    // PCM -> WAV 변환, 결과 WAV 파일명 (in same dir). 호출 시 pcmOut은 이미 close 되어 있어야 함.
//    fun convertToWav(context: Context, wavName: String = "capture.wav"): File? {
//        val dir = context.getExternalFilesDir(null) ?: return null
//        val pcm = pcmFile ?: return null
//        if (!pcm.exists()) {
//            Log.w(TAG, "PCM file not found: ${pcm.absolutePath}")
//            return null
//        }
//
//        val wavFile = File(dir, wavName)
//        try {
//            val pcmSize = pcm.length().toInt()
//            val totalDataLen = 36 + pcmSize
//            val byteRate = sampleRate * channels * bytesPerSample
//
//            val out = BufferedOutputStream(FileOutputStream(wavFile))
//            // RIFF header
//            val header = ByteArray(44)
//            // ChunkID "RIFF"
//            header[0] = 'R'.code.toByte()
//            header[1] = 'I'.code.toByte()
//            header[2] = 'F'.code.toByte()
//            header[3] = 'F'.code.toByte()
//            // ChunkSize (4-7) little endian
//            writeInt(header, 4, totalDataLen)
//            // Format "WAVE"
//            header[8] = 'W'.code.toByte()
//            header[9] = 'A'.code.toByte()
//            header[10] = 'V'.code.toByte()
//            header[11] = 'E'.code.toByte()
//            // Subchunk1 ID "fmt "
//            header[12] = 'f'.code.toByte()
//            header[13] = 'm'.code.toByte()
//            header[14] = 't'.code.toByte()
//            header[15] = ' '.code.toByte()
//            // Subchunk1Size 16 for PCM
//            writeInt(header, 16, 16)
//            // AudioFormat 1 = PCM (2 bytes)
//            writeShort(header, 20, 1.toShort())
//            // NumChannels
//            writeShort(header, 22, channels.toShort())
//            // SampleRate
//            writeInt(header, 24, sampleRate)
//            // ByteRate
//            writeInt(header, 28, byteRate)
//            // BlockAlign
//            writeShort(header, 32, (channels * bytesPerSample).toShort())
//            // BitsPerSample
//            writeShort(header, 34, (bytesPerSample * 8).toShort())
//            // Subchunk2ID "data"
//            header[36] = 'd'.code.toByte()
//            header[37] = 'a'.code.toByte()
//            header[38] = 't'.code.toByte()
//            header[39] = 'a'.code.toByte()
//            // Subchunk2Size pcmSize
//            writeInt(header, 40, pcmSize)
//
//            out.write(header, 0, 44)
//
//            // copy pcm -> wav
//            val input = BufferedInputStream(FileInputStream(pcm))
//            val buffer = ByteArray(1024 * 4)
//            var read: Int
//            while (input.read(buffer).also { read = it } > 0) {
//                out.write(buffer, 0, read)
//            }
//            input.close()
//            out.flush()
//            out.close()
//
//            Log.d(TAG, "convertToWav finished -> ${wavFile.absolutePath}")
//            return wavFile
//        } catch (e: Exception) {
//            Log.w(TAG, "convertToWav failed", e)
//            return null
//        }
//    }
//
//    private fun writeInt(header: ByteArray, offset: Int, value: Int) {
//        header[offset] = (value and 0xff).toByte()
//        header[offset + 1] = ((value shr 8) and 0xff).toByte()
//        header[offset + 2] = ((value shr 16) and 0xff).toByte()
//        header[offset + 3] = ((value shr 24) and 0xff).toByte()
//    }
//
//    private fun writeShort(header: ByteArray, offset: Int, value: Short) {
//        header[offset] = (value.toInt() and 0xff).toByte()
//        header[offset + 1] = ((value.toInt() shr 8) and 0xff).toByte()
//    }
//}
