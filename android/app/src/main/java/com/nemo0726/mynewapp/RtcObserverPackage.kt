package com.nemo0726.mynewapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext

import com.nemo0726.mynewapp.RtcObserverModule

class RtcObserverPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext) =
        listOf(RtcObserverModule(reactContext))  // NativeModule 등록

    override fun createViewManagers(reactContext: ReactApplicationContext) =
        emptyList<Nothing>() // ViewManager는 없음
}
