package com.galerapagos.app.ui

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/** Palette tirée des SVG de /art (ciel d'orage violet, soleil, sable, mer turquoise). */
object Gx {
    val Ink = Color(0xFF12061C)
    val Plum = Color(0xFF2A0F3D)
    val Violet = Color(0xFF4A2068)
    val Magenta = Color(0xFFB23A7C)
    val Coral = Color(0xFFF08A5D)
    val Sun = Color(0xFFF9C97A)
    val Sand = Color(0xFFF4D28F)
    val Teal = Color(0xFF1F8A9B)
    val Leaf = Color(0xFF58C24D)
    val Danger = Color(0xFFE0243A)
    val Paper = Color(0xFFFFF4DC)
}

@Composable
fun GalerapagosTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Gx.Sun,
            background = Gx.Ink,
            surface = Gx.Plum,
            onBackground = Gx.Paper,
            onSurface = Gx.Paper,
        ),
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Gx.Ink, contentColor = Gx.Paper, content = content)
    }
}

/** Vibration (pattern : attente, vibre, attente, vibre…). Silencieux si indisponible. */
@Suppress("DEPRECATION")
fun vibrate(context: Context, pattern: LongArray) {
    try {
        val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        if (vibrator.hasVibrator()) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        }
    } catch (_: Exception) {
        // Pas de vibreur ou permission refusée : on ignore.
    }
}

fun plural(n: Int, word: String, plural: String = word + "s"): String = "$n ${if (n > 1) plural else word}"
