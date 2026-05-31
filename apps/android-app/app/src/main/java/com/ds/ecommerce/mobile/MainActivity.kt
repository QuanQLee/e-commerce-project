package com.ds.ecommerce.mobile

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ds.ecommerce.mobile.data.MobileRepository
import com.ds.ecommerce.mobile.ui.AppScreen
import com.ds.ecommerce.mobile.ui.AppViewModel

class MainActivity : ComponentActivity() {
    private var authRedirectUrl by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        authRedirectUrl = intent?.dataString

        val repository = MobileRepository.create(applicationContext)

        setContent {
            val viewModel: AppViewModel = viewModel(
                factory = AppViewModel.factory(repository),
            )
            AppScreen(
                viewModel = viewModel,
                authRedirectUrl = authRedirectUrl,
                onAuthRedirectConsumed = { authRedirectUrl = null },
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        authRedirectUrl = intent.dataString
    }
}
