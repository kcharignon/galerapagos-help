package com.galerapagos.app.ui

import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.galerapagos.app.Prefs
import com.galerapagos.app.R

private enum class Screen { Home, Wood, Sea }

@Composable
fun GalerapagosApp(prefs: Prefs) {
    var screen by rememberSaveable { mutableStateOf(Screen.Home) }
    BackHandler(enabled = screen != Screen.Home) { screen = Screen.Home }
    Crossfade(targetState = screen, animationSpec = tween(350), label = "screen") { s ->
        when (s) {
            Screen.Home -> HomeScreen(onWood = { screen = Screen.Wood }, onSea = { screen = Screen.Sea })
            Screen.Wood -> WoodScreen(prefs, onBack = { screen = Screen.Home })
            Screen.Sea -> SeaScreen(prefs, onBack = { screen = Screen.Home })
        }
    }
}

@Composable
private fun HomeScreen(onWood: () -> Unit, onSea: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    0f to Gx.SkyTop,
                    0.22f to Gx.Sky,
                    0.40f to Color(0xFFA5DCF7),
                    0.66f to Gx.Sand,
                    1f to Gx.Sand2,
                ),
            )
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Logo()
        WoodSign("BOIS & POISSON DU NAUFRAGÉ", Modifier.padding(top = 18.dp, bottom = 16.dp))
        HomeCard(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            scene = R.drawable.art_scene_jungle_bg,
            bias = 0f,
            title = "La jungle",
            subtitle = "Chercher du bois… si le serpent dort.",
            icon = R.drawable.art_plank,
            iconWidth = 116.dp,
            iconAspect = 220f / 40f,
            onClick = onWood,
        )
        Box(Modifier.padding(top = 4.dp))
        HomeCard(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            scene = R.drawable.art_scene_sea_bg,
            bias = 0.35f,
            title = "La mer",
            subtitle = "Pêcher de quoi nourrir le camp.",
            icon = R.drawable.art_fish,
            iconWidth = 70.dp,
            iconAspect = 110f / 64f,
            onClick = onSea,
        )
    }
}

/** Logo « pierre » : plaque grise, lettres dorées cernées de sombre (sans API texte expérimentale). */
@Composable
private fun Logo() {
    val slab = RoundedCornerShape(20.dp)
    Box(Modifier.rotate(-2f).padding(bottom = 7.dp)) {
        Box(Modifier.matchParentSize().offset(y = 7.dp).background(Color(0xFF2E2B2A), slab))
        Column(
            Modifier
                .clip(slab)
                .background(Brush.verticalGradient(listOf(Color(0xFF8A8582), Color(0xFF5B5755), Color(0xFF46423F))))
                .padding(start = 22.dp, end = 22.dp, top = 8.dp, bottom = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LogoLine("GALÈ")
            LogoLine("RAPAGOS")
        }
    }
}

@Composable
private fun LogoLine(text: String) {
    val style = TextStyle(fontSize = 54.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp, lineHeight = 50.sp)
    val outline = Color(0xFF2B2623)
    Box(contentAlignment = Alignment.Center) {
        // ombre + contour : copies décalées
        for ((dx, dy) in listOf(0 to 5, -2 to 2, 2 to 2, -2 to -2, 2 to -2, 0 to 3)) {
            Text(text, Modifier.offset(dx.dp, dy.dp), color = outline, style = style)
        }
        Text(
            text,
            Modifier
                .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)
                .drawWithContent {
                    drawContent()
                    drawRect(
                        Brush.verticalGradient(listOf(Color(0xFFFFF0A8), Color(0xFFF0BE4A), Color(0xFFB97D1E))),
                        blendMode = BlendMode.SrcIn,
                    )
                },
            color = Color.White,
            style = style,
        )
    }
}

/** Petit panneau de bois portant le sous-titre. */
@Composable
private fun WoodSign(text: String, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(6.dp)
    Box(modifier.rotate(-1f)) {
        Box(Modifier.matchParentSize().offset(y = 4.dp).background(Color(0x735A3A26), shape))
        Text(
            text,
            Modifier
                .clip(shape)
                .background(Brush.verticalGradient(listOf(Color(0xFFECD09A), Color(0xFFD7AB66))))
                .border(2.dp, Gx.Wood, shape)
                .padding(horizontal = 18.dp, vertical = 7.dp),
            color = Color(0xFF4A2F1C),
            fontSize = 13.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.3.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun HomeCard(
    modifier: Modifier,
    @DrawableRes scene: Int,
    bias: Float,
    title: String,
    subtitle: String,
    @DrawableRes icon: Int,
    iconWidth: Dp,
    iconAspect: Float,
    onClick: () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val dy by animateDpAsState(if (pressed) 6.dp else 0.dp, tween(80), label = "cardPress")
    val shape = RoundedCornerShape(28.dp)
    Box(modifier.padding(bottom = 10.dp)) {
        Box(Modifier.matchParentSize().offset(y = 10.dp).background(Color(0x735A3A26), shape))
        Box(
            Modifier
                .matchParentSize()
                .offset(y = dy)
                .clip(shape)
                .border(3.dp, Color.White, shape)
                .clickable(interactionSource = source, indication = null, onClick = onClick),
        ) {
            Art(scene, Modifier.fillMaxSize(), ContentScale.Crop, BiasAlignment(0f, bias))
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Brush.verticalGradient(0.42f to Color.Transparent, 1f to Color(0xD1082C36))),
            )
            Row(
                Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 20.dp, bottom = 16.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Column(Modifier.weight(1f)) {
                    OutlinedText(title, fontSize = 31.sp)
                    Text(
                        subtitle,
                        Modifier.padding(top = 6.dp),
                        color = Color.White,
                        fontSize = 15.sp,
                        lineHeight = 19.sp,
                        fontWeight = FontWeight.Bold,
                        style = TextStyle(shadow = Shadow(Gx.Night, Offset(0f, 3f), 0f)),
                    )
                }
                Art(icon, Modifier.width(iconWidth).aspectRatio(iconAspect))
            }
        }
    }
}
