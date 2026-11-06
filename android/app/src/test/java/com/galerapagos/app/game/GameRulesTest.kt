package com.galerapagos.app.game

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GameRulesTest {

    @Test
    fun `sans risque on garde la planche offerte`() {
        repeat(1_000) {
            assertEquals(1, GameRules.gatherWood(extra = 0, axe = false).total)
            assertEquals(2, GameRules.gatherWood(extra = 0, axe = true).total)
        }
        assertFalse(GameRules.gatherWood(0, false).bitten)
    }

    @Test
    fun `morsure ne retire que les planches du risque`() {
        val random = Random(1)
        var bites = 0
        repeat(5_000) {
            val r = GameRules.gatherWood(extra = 3, axe = true, random = random)
            if (r.bitten) {
                bites++
                assertEquals(2, r.total) // les 2 planches gratuites de la hache restent
                assertEquals(3, r.lost)
            } else {
                assertEquals(2 + 3, r.total)
                assertEquals(0, r.lost)
            }
        }
        assertTrue(bites in 1 until 5_000)
    }

    @Test
    fun `on repart toujours avec au moins les planches gratuites`() {
        val random = Random(5)
        repeat(5_000) {
            val extra = random.nextInt(0, 6)
            assertTrue(GameRules.gatherWood(extra, axe = false, random = random).total >= 1)
            assertTrue(GameRules.gatherWood(extra, axe = true, random = random).total >= 2)
        }
    }

    @Test
    fun `probabilite de morsure egale extra sur six`() {
        val random = Random(42)
        val trials = 60_000
        for (extra in 1..5) {
            val bites = (1..trials).count { GameRules.gatherWood(extra, axe = false, random = random).bitten }
            assertEquals(extra / 6.0, bites.toDouble() / trials, 0.01)
            assertEquals(extra / 6.0, GameRules.biteChance(extra), 1e-9)
        }
    }

    @Test
    fun `peche sans canne suit 3-2-1 sur six`() {
        val random = Random(7)
        val trials = 60_000
        val counts = IntArray(4)
        repeat(trials) { counts[GameRules.fish(rod = false, random = random).total]++ }
        assertEquals(3 / 6.0, counts[1].toDouble() / trials, 0.01)
        assertEquals(2 / 6.0, counts[2].toDouble() / trials, 0.01)
        assertEquals(1 / 6.0, counts[3].toDouble() / trials, 0.01)
    }

    @Test
    fun `canne prend deux tirages et additionne`() {
        val random = Random(9)
        repeat(5_000) {
            val r = GameRules.fish(rod = true, random = random)
            assertEquals(2, r.catches.size)
            assertTrue(r.total in 2..5)
        }
    }

    @Test
    fun `statistiques de peche`() {
        val one = GameRules.fishStats(1)
        assertEquals(1, one.min)
        assertEquals(3, one.max)
        assertEquals(10.0 / 6.0, one.mean, 1e-9)
        val two = GameRules.fishStats(2)
        assertEquals(2, two.min)
        assertEquals(5, two.max)
        assertEquals(20.0 / 6.0, two.mean, 1e-9)
    }
}
