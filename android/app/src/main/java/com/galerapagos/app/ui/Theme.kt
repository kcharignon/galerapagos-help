package com.galerapagos.app.ui

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/** Palette relevée sur les scans du jeu : ciel bleu-violet, sable pêche, lagon turquoise, jungle vive, bois et orange des marqueurs. */
object Gx {
    val Ink = Color(0xFF173A40) // texte foncé (sarcelle) sur le sable
    val Ink2 = Color(0xFF4B6F72)
    val Night = Color(0xFF0B3138) // contour des gros titres blancs
    val Paper = Color(0xFFFFF6E0)
    val Sand = Color(0xFFF9DFB5)
    val Sand2 = Color(0xFFF2C999)
    val SandLine = Color(0xFFD9B98A)
    val Wood = Color(0xFF8A5A3A)
    val Teal = Color(0xFF2FC6CC)
    val TealDeep = Color(0xFF17879F)
    val Leaf = Color(0xFF3DBB4C)
    val Orange = Color(0xFFF2842D)
    val OrangeDeep = Color(0xFFD9611F)
    val Red = Color(0xFFD8343F)
    val Sun = Color(0xFFFFD36A)
    val Sky = Color(0xFF5BB4EE)
    val SkyTop = Color(0xFF2F8FE0)
}

@Composable
fun GalerapagosTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Gx.Orange,
            background = Gx.Sand,
            surface = Gx.Paper,
            onBackground = Gx.Ink,
            onSurface = Gx.Ink,
        ),
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Gx.SkyTop, contentColor = Gx.Ink, content = content)
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
