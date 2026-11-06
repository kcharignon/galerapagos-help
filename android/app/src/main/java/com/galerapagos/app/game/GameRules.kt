package com.galerapagos.app.game

import kotlin.random.Random

/**
 * Règles du tirage. Aucune bille n'est montrée au joueur : c'est un simple moteur de hasard.
 *
 * - Bois : 1 planche gratuite (2 avec la hache), TOUJOURS gardée. Le joueur peut ajouter de 1 à 5
 *   planches en risquant le coup : un tirage simultané de autant d'éléments dans un sac de 6 dont
 *   1 serpent. Si le serpent sort, seules les planches en plus sont perdues : les gratuites restent.
 * - Pêche : un tirage dans un sac de 6 (3×1 poisson, 2×2, 1×3). Avec la canne : deux tirages
 *   simultanés, le total est la somme des poissons.
 */
object GameRules {
    const val MAX_EXTRA = 5

    /** `true` = serpent. */
    private val woodBag: List<Boolean> = List(5) { false } + true

    /** Poissons par tirage : 3 tirages à 1 poisson, 2 à 2 poissons, 1 à 3 poissons. */
    val fishBag: List<Int> = listOf(1, 1, 1, 2, 2, 3)

    data class WoodResult(val free: Int, val extra: Int, val bitten: Boolean) {
        /** Planches du risque perdues par la morsure (les gratuites ne sont jamais perdues). */
        val lost: Int get() = if (bitten) extra else 0
        val total: Int get() = free + (if (bitten) 0 else extra)
    }

    data class FishResult(val catches: List<Int>) {
        val total: Int get() = catches.sum()
    }

    data class FishStats(val min: Int, val max: Int, val mean: Double)

    /** Probabilité d'être mordu en tentant `extra` planches de plus. */
    fun biteChance(extra: Int): Double = extra.coerceIn(0, MAX_EXTRA).toDouble() / woodBag.size

    fun freePlanks(axe: Boolean): Int = if (axe) 2 else 1

    fun gatherWood(extra: Int, axe: Boolean, random: Random = Random.Default): WoodResult {
        val n = extra.coerceIn(0, MAX_EXTRA)
        val bitten = n > 0 && woodBag.shuffled(random).take(n).any { it }
        return WoodResult(free = freePlanks(axe), extra = n, bitten = bitten)
    }

    fun fish(rod: Boolean, random: Random = Random.Default): FishResult =
        FishResult(fishBag.shuffled(random).take(if (rod) 2 else 1))

    fun fishStats(draws: Int): FishStats {
        val sorted = fishBag.sorted()
        return FishStats(
            min = sorted.take(draws).sum(),
            max = sorted.takeLast(draws).sum(),
            mean = fishBag.average() * draws,
        )
    }
}
