package com.galerapagos.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.galerapagos.app.Prefs
import com.galerapagos.app.R
import com.galerapagos.app.game.GameRules
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class SeaPhase { Idle, Busy, Result }

/** Mer : lancer la ligne, avec ou sans canne à pêche. */
@Composable
fun SeaScreen(prefs: Prefs, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var rod by remember { mutableStateOf(prefs.rod) }
    var phase by remember { mutableStateOf(SeaPhase.Idle) }
    var result by remember { mutableStateOf<GameRules.FishResult?>(null) }
    var resultRod by remember { mutableStateOf(false) }

    fun start() {
        if (phase != SeaPhase.Idle) return
        scope.launch {
            phase = SeaPhase.Busy
            delay(1800)
            val r = GameRules.fish(rod)
            resultRod = rod
            result = r
            phase = SeaPhase.Result
            vibrate(context, longArrayOf(0, (r.total * 12L).coerceAtLeast(10L)))
        }
    }

    SceneScaffold(
        title = "La mer",
        bg = R.drawable.art_scene_sea_bg,
        fg = R.drawable.art_scene_sea_fg,
        busy = phase == SeaPhase.Busy,
        onBack = onBack,
        stage = {
            val r = result
            when {
                phase == SeaPhase.Busy -> {
                    HintPill("La ligne frétille", Modifier.align(Alignment.TopCenter).padding(top = 40.dp))
                    Bobber()
                }
                phase == SeaPhase.Result && r != null -> Catches(r, resultRod)
            }
        },
        sheet = {
            val r = result
            if (phase == SeaPhase.Result && r != null) {
                val stats = GameRules.fishStats(if (resultRod) 2 else 1)
                val ratio = r.total.toFloat() / stats.max
                ResultPane(
                    kicker = when {
                        ratio <= 0.4f -> "Pêche maigre"
                        ratio <= 0.8f -> "Belle prise"
                        else -> "Pêche miraculeuse !"
                    },
                    big = "+${plural(r.total, "poisson")}",
                    bad = false,
                    sub = if (resultRod) {
                        "Deux prises avec la canne : ${r.catches.joinToString(" + ")} = ${plural(r.total, "poisson")}."
                    } else if (r.total == stats.min) {
                        "Un seul poisson au bout de la ligne."
                    } else {
                        "${plural(r.total, "poisson")} au bout de la ligne."
                    },
                    buttonLabel = "Pêcher encore",
                    sea = true,
                    onAgain = { phase = SeaPhase.Idle },
                )
            } else {
                val idle = phase == SeaPhase.Idle
                val stats = GameRules.fishStats(if (rod) 2 else 1)
                val mean = String.format(Locale.FRANCE, "%.1f", stats.mean)
                GearToggle(
                    icon = R.drawable.art_rod,
                    title = "Canne à pêche",
                    subtitle = "Deux prises au lieu d’une",
                    checked = rod,
                    enabled = idle,
                ) {
                    rod = !rod
                    prefs.rod = rod
                }
                Text(
                    text = "${if (rod) "Tu lances deux fois la ligne" else "Tu lances la ligne une fois"} : " +
                        "de ${plural(stats.min, "poisson")} à ${stats.max}, environ $mean en moyenne.",
                    modifier = Modifier.padding(start = 2.dp, end = 2.dp, top = 16.dp, bottom = 12.dp).heightIn(min = 40.dp),
                    fontSize = 14.sp,
                    lineHeight = 19.sp,
                    color = Gx.Ink2,
                    fontWeight = FontWeight.Bold,
                )
                CtaButton(text = "Lancer la ligne", sea = true, enabled = idle, onClick = { start() })
            }
        },
    )
}

/** Flotteur qui tressaute pendant l'attente. */
@Composable
private fun Bobber() {
    val t = rememberInfiniteTransition(label = "bobber")
    val tug by t.animateFloat(
        initialValue = -3f,
        targetValue = 12f,
        animationSpec = infiniteRepeatable(tween(220, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "tug",
    )
    val ripple1 by t.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1400, easing = LinearOutSlowInEasing)),
        label = "ripple1",
    )
    val ripple2 by t.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1400, easing = LinearOutSlowInEasing), initialStartOffset = StartOffset(700)),
        label = "ripple2",
    )
    Box(Modifier.size(120.dp, 140.dp)) {
        Ripple(ripple1)
        Ripple(ripple2)
        Art(
            R.drawable.art_float,
            Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp)
                .width(28.dp)
                .aspectRatio(28f / 40f)
                .graphicsLayer { translationY = tug * density },
        )
    }
}

@Composable
private fun BoxScope.Ripple(progress: Float) {
    Art(
        R.drawable.art_ripple,
        Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .aspectRatio(120f / 40f)
            .graphicsLayer {
                val s = 0.3f + 0.95f * progress
                scaleX = s
                scaleY = s
                alpha = 0.9f * (1f - progress)
            },
    )
}

/** Poissons qui bondissent hors de l'eau, une rangée par prise. */
@Composable
private fun Catches(result: GameRules.FishResult, rod: Boolean) {
    // délai de départ de chaque poisson (ms), calculé une fois pour toutes
    val delays = remember(result) {
        var d = 0
        result.catches.map { n -> List(n) { d.also { d += 170 } } to d }
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        result.catches.forEachIndexed { ci, n ->
            val (fishDelays, tagDelay) = delays[ci]
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                fishDelays.forEachIndexed { i, delayMs ->
                    LeapingFish(delayMs = delayMs, mirror = (i + ci) % 2 == 1)
                }
                if (rod) CatchTag("+$n", tagDelay)
            }
        }
        Art(R.drawable.art_ripple, Modifier.width(210.dp).aspectRatio(120f / 40f).padding(top = 0.dp))
    }
}

@Composable
private fun LeapingFish(delayMs: Int, mirror: Boolean) {
    val p = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(delayMs.toLong())
        p.animateTo(1f, tween(950, easing = LinearEasing))
    }
    Box(
        Modifier
            .width(84.dp)
            .aspectRatio(110f / 64f)
            .graphicsLayer {
                val t = p.value
                translationY = piecewise(t, 0f to 220f, 0.45f to -70f, 0.75f to -6f, 1f to 0f) * density
                rotationZ = piecewise(t, 0f to -40f, 0.45f to -12f, 0.75f to 8f, 1f to 0f)
                val s = piecewise(t, 0f to 0.5f, 0.45f to 1.1f, 1f to 1f)
                scaleX = s
                scaleY = s
                alpha = (t / 0.15f).coerceIn(0f, 1f)
            },
    ) {
        Art(R.drawable.art_fish, Modifier.fillMaxSize().graphicsLayer { scaleX = if (mirror) -1f else 1f })
    }
}

@Composable
private fun CatchTag(text: String, delayMs: Int) {
    val a = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(delayMs + 500L)
        a.animateTo(1f, tween(300))
    }
    OutlinedText(
        text,
        fontSize = 21.sp,
        modifier = Modifier.width(44.dp).graphicsLayer { alpha = a.value },
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
}
