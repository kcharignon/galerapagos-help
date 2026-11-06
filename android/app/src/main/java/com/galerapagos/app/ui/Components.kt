package com.galerapagos.app.ui

import androidx.annotation.DrawableRes
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/** Affiche une illustration (VectorDrawable généré depuis les SVG du dossier art). */
@Composable
fun Art(
    @DrawableRes id: Int,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
    alignment: Alignment = Alignment.Center,
) {
    Image(
        painter = painterResource(id),
        contentDescription = null,
        modifier = modifier,
        alignment = alignment,
        contentScale = contentScale,
    )
}

/** Gros titre blanc cerné d'un trait sombre, comme les titres des cartes du jeu (copies décalées, sans API texte expérimentale). */
@Composable
fun OutlinedText(
    text: String,
    fontSize: TextUnit,
    modifier: Modifier = Modifier,
    color: Color = Color.White,
    outline: Color = Gx.Night,
    textAlign: TextAlign? = null,
) {
    Box(modifier) {
        for ((dx, dy) in listOf(-2 to 0, 2 to 0, 0 to -2, 0 to 3, -1 to -1, 1 to -1, -1 to 2, 1 to 2)) {
            Text(text, Modifier.fillMaxWidth().offset(dx.dp, dy.dp), color = outline, fontSize = fontSize, fontWeight = FontWeight.Black, textAlign = textAlign)
        }
        Text(text, Modifier.fillMaxWidth(), color = color, fontSize = fontSize, fontWeight = FontWeight.Black, textAlign = textAlign)
    }
}

/** Interpolation linéaire par morceaux : stops = (position 0..1, valeur). */
fun piecewise(t: Float, vararg stops: Pair<Float, Float>): Float {
    for (i in 1 until stops.size) {
        val (t1, v1) = stops[i]
        if (t <= t1) {
            val (t0, v0) = stops[i - 1]
            return v0 + (v1 - v0) * ((t - t0) / (t1 - t0)).coerceIn(0f, 1f)
        }
    }
    return stops.last().second
}

/** Gros bouton "3D" (face + ombre dure dessous), enfoncé au toucher. `Modifier.height` = hauteur totale. */
@Composable
fun ChunkyButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    face: Brush,
    shadow: Color,
    depth: Dp = 6.dp,
    corner: Dp = 20.dp,
    enabled: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val dy by animateDpAsState(if (pressed && enabled) depth - 1.dp else 0.dp, tween(60), label = "press")
    val shape = RoundedCornerShape(corner)
    Box(modifier.padding(bottom = depth)) {
        Box(Modifier.matchParentSize().offset(y = depth).background(shadow, shape))
        Box(
            Modifier
                .matchParentSize()
                .offset(y = dy)
                .clip(shape)
                .background(face)
                .clickable(interactionSource = source, indication = null, enabled = enabled, onClick = onClick),
            contentAlignment = Alignment.Center,
            content = content,
        )
    }
}

/** Bouton principal d'action (orange/rose pour la forêt, turquoise pour la mer). */
@Composable
fun CtaButton(text: String, sea: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    val face = if (sea) {
        Brush.verticalGradient(listOf(Color(0xFF46D8DE), Gx.TealDeep))
    } else {
        Brush.verticalGradient(listOf(Color(0xFFFFA24F), Gx.OrangeDeep))
    }
    ChunkyButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(66.dp),
        face = face,
        shadow = if (sea) Color(0xFF0A5A72) else Color(0xFF9A3F12),
        enabled = enabled,
    ) {
        Text(
            text = text.uppercase(),
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 0.8.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
    }
}

/** Interrupteur d'équipement (hache, canne à pêche). */
@Composable
fun GearToggle(
    @DrawableRes icon: Int,
    title: String,
    subtitle: String,
    checked: Boolean,
    enabled: Boolean = true,
    onToggle: () -> Unit,
) {
    val border by animateColorAsState(if (checked) Gx.Leaf else Gx.SandLine, label = "gearBorder")
    val bg by animateColorAsState(if (checked) Color(0x2E3DBB4C) else Color(0x99FFFFFF), label = "gearBg")
    val track by animateColorAsState(if (checked) Gx.Leaf else Color(0x405A3A26), label = "gearTrack")
    val thumb by animateDpAsState(if (checked) 20.dp else 0.dp, spring(dampingRatio = 0.6f, stiffness = Spring.StiffnessMedium), label = "gearThumb")
    val shape = RoundedCornerShape(18.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(bg)
            .border(2.dp, border, shape)
            .clickable(enabled = enabled, onClick = onToggle)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Art(icon, Modifier.size(40.dp).alpha(if (checked) 1f else 0.55f))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, fontSize = 13.sp, color = Gx.Ink2, lineHeight = 16.sp)
        }
        Box(Modifier.size(50.dp, 30.dp).clip(RoundedCornerShape(15.dp)).background(track)) {
            Box(
                Modifier
                    .offset(x = thumb)
                    .padding(3.dp)
                    .size(24.dp)
                    .shadow(2.dp, CircleShape)
                    .background(Color.White, CircleShape),
            )
        }
    }
}

/** Barre du haut : retour + titre. */
@Composable
fun TopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().padding(start = 14.dp, end = 14.dp, top = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Gx.Paper)
                .border(3.dp, Color.White, CircleShape)
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.size(22.dp)) {
                val w = size.width
                val path = Path().apply {
                    moveTo(w * 0.62f, w * 0.2f)
                    lineTo(w * 0.32f, w * 0.5f)
                    lineTo(w * 0.62f, w * 0.8f)
                }
                drawPath(path, Gx.Ink, style = Stroke(width = 3.4.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            }
        }
        OutlinedText(title, fontSize = 23.sp)
    }
}

/** Panneau du bas (commandes ou résultat). */
@Composable
fun Sheet(content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.verticalGradient(listOf(Color(0xFFFCEBC9), Color(0xFFF3D29F))))
            .border(3.dp, Gx.Paper, shape)
            .navigationBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 18.dp),
    ) {
        Box(
            Modifier
                .align(Alignment.CenterHorizontally)
                .padding(bottom = 12.dp)
                .size(44.dp, 5.dp)
                .background(Color(0x4D5A3A26), RoundedCornerShape(3.dp)),
        )
        content()
    }
}

/** Bulle de texte pendant l'attente ("La ligne frétille…"). */
@Composable
fun HintPill(text: String, modifier: Modifier = Modifier) {
    var dots by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(300)
            dots = (dots + 1) % 4
        }
    }
    val pulse by rememberInfiniteTransition(label = "pulse").animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label = "pulseScale",
    )
    Box(
        modifier
            .graphicsLayer { scaleX = pulse; scaleY = pulse }
            .background(Color(0xEBFFF6E0), RoundedCornerShape(50))
            .border(2.dp, Color.White, RoundedCornerShape(50))
            .padding(horizontal = 20.dp, vertical = 10.dp),
    ) {
        Text(text + ".".repeat(dots), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
    }
}

/** Panneau de résultat, qui "monte" à l'apparition. */
@Composable
fun ResultPane(
    kicker: String,
    big: String,
    bad: Boolean,
    sub: String,
    buttonLabel: String,
    sea: Boolean,
    onAgain: () -> Unit,
) {
    val rise = remember { Animatable(0f) }
    LaunchedEffect(Unit) { rise.animateTo(1f, spring(dampingRatio = 0.6f, stiffness = 200f)) }
    Column(
        Modifier
            .fillMaxWidth()
            .graphicsLayer {
                translationY = (1f - rise.value) * 30.dp.toPx()
                alpha = rise.value.coerceIn(0f, 1f)
            }
            .padding(top = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(kicker.uppercase(), fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 2.sp, color = Gx.TealDeep, textAlign = TextAlign.Center)
        Text(
            big,
            modifier = Modifier.padding(top = 6.dp),
            fontSize = 44.sp,
            fontWeight = FontWeight.Black,
            color = if (bad) Gx.Red else Gx.OrangeDeep,
            textAlign = TextAlign.Center,
        )
        Text(
            sub,
            modifier = Modifier.padding(start = 6.dp, end = 6.dp, top = 10.dp, bottom = 16.dp),
            fontSize = 15.sp,
            lineHeight = 21.sp,
            color = Gx.Ink2,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        CtaButton(buttonLabel, sea = sea, onClick = onAgain)
    }
}

/**
 * Structure commune des écrans de jeu : décor (fond + premier plan qui bruisse pendant l'attente),
 * barre du haut, zone d'animation (`stage`) qui s'arrête au-dessus du panneau de commande (`sheet`).
 */
@Composable
fun SceneScaffold(
    title: String,
    @DrawableRes bg: Int,
    @DrawableRes fg: Int,
    busy: Boolean,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    overlay: @Composable BoxScope.() -> Unit = {},
    stage: @Composable BoxScope.() -> Unit,
    sheet: @Composable ColumnScope.() -> Unit,
) {
    Box(modifier.fillMaxSize().background(Gx.SkyTop)) {
        val bgScale by animateFloatAsState(if (busy) 1.06f else 1f, tween(2400), label = "bgScale")
        Art(
            bg,
            Modifier.fillMaxSize().graphicsLayer {
                scaleX = bgScale
                scaleY = bgScale
                transformOrigin = TransformOrigin(0.5f, 0.6f)
            },
            ContentScale.Crop,
        )
        val rustle by rememberInfiniteTransition(label = "rustle").animateFloat(
            initialValue = -1.6f,
            targetValue = 1.6f,
            animationSpec = infiniteRepeatable(tween(280, easing = LinearEasing), RepeatMode.Reverse),
            label = "rustleAngle",
        )
        Art(
            fg,
            Modifier.fillMaxSize().graphicsLayer {
                transformOrigin = TransformOrigin(0.5f, 1f)
                if (busy) {
                    rotationZ = rustle
                    scaleX = 1.02f
                    scaleY = 1.02f
                }
            },
            ContentScale.Crop,
        )
        Column(Modifier.fillMaxSize()) {
            TopBar(title, onBack)
            Box(
                Modifier.weight(1f).fillMaxWidth().padding(bottom = 14.dp),
                contentAlignment = Alignment.BottomCenter,
                content = stage,
            )
            Sheet(content = sheet)
        }
        overlay()
    }
}
