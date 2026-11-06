package com.galerapagos.app

import android.content.Context

/** Mémorise les choix du joueur (hache, canne, risque). Jamais bloquant. */
class Prefs(context: Context) {
    private val sp = context.applicationContext.getSharedPreferences("galerapagos", Context.MODE_PRIVATE)

    var extra: Int
        get() = sp.getInt("extra", 0).coerceIn(0, 5)
        set(v) = sp.edit().putInt("extra", v).apply()

    var axe: Boolean
        get() = sp.getBoolean("axe", false)
        set(v) = sp.edit().putBoolean("axe", v).apply()

    var rod: Boolean
        get() = sp.getBoolean("rod", false)
        set(v) = sp.edit().putBoolean("rod", v).apply()
}
