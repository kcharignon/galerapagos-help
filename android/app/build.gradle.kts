plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Version : l'étiquette android-vX.Y.Z donne le nom (X.Y.Z) ET le code de version (X*1_000_000 + Y*1_000 + Z), qui ne doit jamais
// baisser pour qu'une version s'installe par-dessus la précédente. Sans étiquette : « 0.0.0-dev » et ANDROID_VERSION_CODE (ou 1).
val versionTag: String? = System.getenv("ANDROID_VERSION_TAG")?.takeIf { it.isNotBlank() }
val tagMatch = versionTag?.let {
    Regex("""android-v(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})""").matchEntire(it)
        ?: throw GradleException("ANDROID_VERSION_TAG « $it » n'est pas de la forme android-vX.Y.Z.")
}
val appVersionName: String = tagMatch?.destructured?.let { (x, y, z) -> "$x.$y.$z" } ?: "0.0.0-dev"
val appVersionCode: Int = tagMatch?.destructured?.let { (x, y, z) -> x.toInt() * 1_000_000 + y.toInt() * 1_000 + z.toInt() }
    ?: (System.getenv("ANDROID_VERSION_CODE")?.toIntOrNull() ?: 1)

android {
    namespace = "com.galerapagos.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.galerapagos.app"
        minSdk = 26
        targetSdk = 34
        versionCode = appVersionCode
        versionName = appVersionName
    }

    signingConfigs {
        // Clé de débogage PUBLIQUE, suivie par Git (mot de passe « android ») : elle ne protège rien, mais toutes les constructions de
        // débogage (locale, CI) ont ainsi la même signature et se mettent à jour par-dessus l'ancienne.
        getByName("debug") {
            storeFile = rootProject.file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        // Clé de publication : fournie par l'environnement (build.sh la décode d'un secret GitHub), jamais écrite dans le dépôt.
        create("release") {
            val keystore = System.getenv("ANDROID_KEYSTORE_FILE")
            if (!keystore.isNullOrBlank()) {
                storeFile = File(keystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
    lint {
        checkReleaseBuilds = false
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        // Compose Compiler 1.5.14 <-> Kotlin 1.9.24
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")

    testImplementation("junit:junit:4.13.2")
}
