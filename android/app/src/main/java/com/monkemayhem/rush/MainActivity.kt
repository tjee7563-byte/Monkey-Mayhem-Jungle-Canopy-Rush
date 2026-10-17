package com.monkemayhem.rush

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * MainActivity for Monke Mayhem: Jungle Canopy Rush.
 *
 * Configured with hardware-accelerated Canvas & WebAudio support,
 * sticky immersive fullscreen mode, and local offline asset loading.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen awake during gameplay
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Enable immersive sticky fullscreen mode
        enableFullscreen()

        webView = WebView(this).apply {
            setBackgroundColor(0xFF0F281E.toInt())
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER

            // Enable layer hardware acceleration for 60-120fps canvas rendering
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                useWideViewPort = true
                loadWithOverviewMode = true

                // Disable gesture requirement so WebAudio sound effects trigger instantly
                mediaPlaybackRequiresUserGesture = false

                // Cache configuration
                cacheMode = WebSettings.LOAD_DEFAULT

                // Display scaling
                displayZoomControls = false
                builtInZoomControls = false
                textZoom = 100
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    // Keep all internal navigation inside the WebView
                    return false
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    return true
                }
            }
        }

        setContentView(webView)

        // Intercept back button to pause game or confirm exit
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Send Escape key event to pause game in web layer
                webView.evaluateJavascript(
                    "window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape', 'bubbles': true}));",
                    null
                )

                // Show exit dialog
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Monke Mayhem")
                    .setMessage("Do you want to pause or exit to home?")
                    .setPositiveButton("Keep Playing", null)
                    .setNegativeButton("Exit Game") { _, _ ->
                        finish()
                    }
                    .show()
            }
        })

        // Load local offline game bundle (built into assets/public/)
        webView.loadUrl("file:///android_asset/public/index.html")
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableFullscreen()
        }
    }

    override fun onResume() {
        super.onResume()
        enableFullscreen()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private fun enableFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }
}
