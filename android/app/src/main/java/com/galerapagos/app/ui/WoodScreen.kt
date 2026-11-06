package com.galerapagos.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.galerapagos.app.Prefs
import com.galerapagos.app.R
import com.galerapagos.app.game.GameRules
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private enum class Phase { Idle, Busy, Result }

/** Jungle : choisir le nombre de planches de risque, puis tenter sa chance. */
@Composable
fun WoodScreen(prefs: Prefs, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var extra by remember { mutableIntStateOf(prefs.extra) }
    var axe by remember { mutableStateOf(prefs.axe) }
    var phase by remember { mutableStateOf(Phase.Idle) }
    var result by remember { mutableStateOf<GameRules.WoodResult?>(null) }
    val flash = remember { Animatable(0f) }
    val shake = remember { Animatable(0f) }

    fun start() {
        if (phase != Phase.Idle) return
        scope.launch {
            phase = Phase.Busy
            delay(if (extra > 0) 1100L + extra * 380L else 800L)
            val r = GameRules.gatherWood(extra, axe)
            result = r
            phase = Phase.Result
            if (r.bitten) {
                vibrate(context, longArrayOf(0, 220, 70, 220, 70, 320))
                launch {
                    flash.snapTo(1f)
                    flash.animateTo(0f, tween(1100))
                }
                launch {
                    shake.snapTo(0f)
                    shake.animateTo(
                        0f,
                        keyframes {
                            durationMillis = 500
                            0f at 0
                            -3f at 50
                            6f at 100
                            -9f at 150
                            9f at 200
                            -9f at 250
                            9f at 300
                            -9f at 350
                            6f at 400
                            -3f at 450
                        },
                    )
                }
            } else {
                vibrate(context, if (r.extra > 0) longArrayOf(0, 30, 40, 30) else longArrayOf(0, 20))
            }
        }
    }

    SceneScaffold(
        title = "La jungle",
        bg = R.drawable.art_scene_jungle_bg,
        fg = R.drawable.art_scene_jungle_fg,
        busy = phase == Phase.Busy,
        onBack = onBack,
        modifier = Modifier.graphicsLayer { translationX = shake.value * density },
        overlay = {
            Box(
                Modifier
                    .fillMaxSize()
                    .graphicsLayer { alpha = flash.value }
                    .drawBehind {
                        drawRect(
                            Brush.radialGradient(
                                0.3f to Color(0x00E0243A),
                                1f to Color(0xBFE0243A),
                                center = center,
                                radius = size.maxDimension * 0.65f,
                            ),
                        )
                    },
            )
        },
        stage = {
            val r = result
            when {
                phase == Phase.Busy -> HintPill(
                    if (extra > 0) "Tu t’enfonces dans la jungle" else "Tu fouilles la lisière",
                    Modifier.align(Alignment.TopCenter).padding(top = 40.dp),
                )
                phase == Phase.Result && r != null ->
                    if (r.bitten) SnakeStrike() else PlankPile(total = r.total, free = r.free)
            }
        },
        sheet = {
            val r = result
            if (phase == Phase.Result && r != null) {
                WoodResultPane(r) { phase = Phase.Idle }
            } else {
                val idle = phase == Phase.Idle
                val free = GameRules.freePlanks(axe)
                GearToggle(
                    icon = R.drawable.art_axe,
                    title = "Hache",
                    subtitle = "2 planches offertes au lieu d’1",
                    checked = axe,
                    enabled = idle,
                ) {
                    axe = !axe
                    prefs.axe = axe
                }
                RiskLabel(extra)
                ExtraChips(selected = extra, enabled = idle) {
                    extra = it
                    prefs.extra = it
                }
                RiskMeter(GameRules.biteChance(extra).toFloat(), extra > 0)
                Text(
                    text = if (extra > 0) {
                        "Si tout va bien : $free + $extra = ${plural(free + extra, "planche")}. " +
                            "Si le serpent frappe : rien, pas même la planche de départ."
                    } else {
                        "Tu ramasses ${plural(free, "planche")} à la lisière. Sans danger."
                    },
                    modifier = Modifier.padding(start = 2.dp, end = 2.dp, top = 10.dp, bottom = 12.dp).heightIn(min = 40.dp),
                    fontSize = 14.sp,
                    lineHeight = 19.sp,
                    color = Gx.Ink2,
                    fontWeight = FontWeight.Bold,
                )
                CtaButton(
                    text = if (extra > 0) "S’enfoncer dans la jungle" else "Ramasser en lisière",
                    sea = false,
                    enabled = idle,
                    onClick = { start() },
                )
            }
        },
    )
}

@Composable
private fun RiskLabel(extra: Int) {
    val pct = (GameRules.biteChance(extra) * 100).roundToInt()
    Row(
        Modifier.fillMaxWidth().padding(start = 2.dp, end = 2.dp, top = 14.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Text("Planches en plus", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
        Text(
            if (extra > 0) "Risque de morsure : $pct %" else "Aucun risque",
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Gx.OrangeDeep,
        )
    }
}

@Composable
private fun ExtraChips(selected: Int, enabled: Boolean, onSelect: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        for (n in 0..GameRules.MAX_EXTRA) {
            val on = n == selected
            ChunkyButton(
                onClick = { onSelect(n) },
                modifier = Modifier.weight(1f).height(58.dp),
                face = Brush.verticalGradient(
                    if (on) listOf(Color(0xFFFFB15F), Gx.Orange) else listOf(Gx.Paper, Gx.Paper),
                ),
                shadow = if (on) Color(0xFFB4501B) else Color(0xFFC79E68),
                depth = 4.dp,
                corner = 16.dp,
                enabled = enabled,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        n.toString(),
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = if (on) Color.White else Gx.Wood,
                        lineHeight = 26.sp,
                    )
                    if (n == 0) {
                        Text(
                            "PRUDENT",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (on) Color.White else Gx.Wood,
                            lineHeight = 9.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RiskMeter(fraction: Float, visible: Boolean) {
    val shown by animateFloatAsState(
        if (visible) fraction.coerceAtLeast(0.06f) else 0f,
        spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMediumLow),
        label = "risk",
    )
    Box(
        Modifier
            .padding(start = 2.dp, end = 2.dp, top = 12.dp)
            .fillMaxWidth()
            .height(8.dp)
            .drawBehind {
                val corner = CornerRadius(4.dp.toPx())
                drawRoundRect(Color(0x335A3A26), cornerRadius = corner)
                if (shown > 0f) {
                    drawRoundRect(
                        brush = Brush.horizontalGradient(
                            listOf(Gx.Leaf, Color(0xFFF0CF3A), Gx.Red),
                            startX = 0f,
                            endX = size.width,
                        ),
                        size = Size(size.width * shown, size.height),
                        cornerRadius = corner,
                    )
                }
            },
    )
}

@Composable
private fun WoodResultPane(r: GameRules.WoodResult, onAgain: () -> Unit) {
    if (r.bitten) {
        ResultPane(
            kicker = "Un serpent !",
            big = "Mordu !",
            bad = true,
            sub = "Le serpent t’a surpris : tu perds tout ton bois, même " +
                "${if (r.free > 1) "les planches" else "la planche"} de départ.",
            buttonLabel = "Repartir en forêt",
            sea = false,
            onAgain = onAgain,
        )
    } else {
        ResultPane(
            kicker = if (r.extra > 0) "Le serpent dormait" else "Rien à craindre",
            big = "+${plural(r.total, "planche")}",
            bad = false,
            sub = if (r.extra > 0) {
                "${plural(r.free, "planche offerte", "planches offertes")} + " +
                    "${plural(r.extra, "trouvée")} en risquant le coup."
            } else {
                "${plural(r.free, "planche")} ramassée${if (r.free > 1) "s" else ""} à la lisière."
            },
            buttonLabel = "Repartir en forêt",
            sea = false,
            onAgain = onAgain,
        )
    }
}

// ───────────────────────── animations de résultat ─────────────────────────

private val PLANK_ROTS = listOf(-3f, 2.5f, -1.5f, 3f, -2.5f, 1.5f, -2f)
private val PLANK_DXS = listOf(-8, 10, -4, 7, -10, 5, -3)

@Composable
private fun PlankPile(total: Int, free: Int) {
    Box(Modifier.size(270.dp, 268.dp)) {
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 30.dp)
                .fillMaxWidth()
                .height(20.dp)
                .background(Color(0x593C230A), CircleShape),
        )
        for (i in 0 until total.coerceAtMost(PLANK_ROTS.size)) {
            Plank(index = i, free = i < free, rot = PLANK_ROTS[i], dx = PLANK_DXS[i])
        }
    }
}

@Composable
private fun BoxScope.Plank(index: Int, free: Boolean, rot: Float, dx: Int) {
    val p = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(index * 170L)
        p.animateTo(1f, spring(dampingRatio = 0.55f, stiffness = 130f))
    }
    Box(
        Modifier
            .align(Alignment.BottomCenter)
            .offset(x = dx.dp, y = (-31 * index).dp)
            .width(236.dp)
            .aspectRatio(220f / 40f)
            .graphicsLayer {
                translationY = (1f - p.value) * -460.dp.toPx()
                rotationZ = rot + (1f - p.value) * 50f
                alpha = (p.value * 6f).coerceIn(0f, 1f)
            },
    ) {
        Art(R.drawable.art_plank, Modifier.fillMaxSize())
        if (free) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = 6.dp, y = (-8).dp)
                    .size(22.dp)
                    .background(Gx.Leaf, CircleShape)
                    .border(2.dp, Color.White, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(Modifier.size(12.dp)) {
                    val w = size.width
                    val tick = Path().apply {
                        moveTo(w * 0.1f, w * 0.52f)
                        lineTo(w * 0.4f, w * 0.82f)
                        lineTo(w * 0.92f, w * 0.2f)
                    }
                    drawPath(tick, Color.White, style = Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
                }
            }
        }
    }
}

@Composable
private fun SnakeStrike() {
    val p = remember { Animatable(0f) }
    LaunchedEffect(Unit) { p.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 90f)) }
    val sway by rememberInfiniteTransition(label = "sway").animateFloat(
        initialValue = -3f,
        targetValue = 3f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "swayAngle",
    )
    Art(
        R.drawable.art_snake,
        Modifier
            .width(230.dp)
            .aspectRatio(190f / 210f)
            .graphicsLayer {
                transformOrigin = TransformOrigin(0.5f, 1f)
                translationY = (1f - p.value) * size.height * 1.2f
                val s = 0.7f + 0.3f * p.value
                scaleX = s
                scaleY = s
                rotationZ = sway
            },
    )
}
