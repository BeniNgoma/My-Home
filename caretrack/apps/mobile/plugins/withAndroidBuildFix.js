/**
 * Config plugin appliqué pendant expo prebuild (avant Gradle).
 * Corrige deux problèmes connus avec expo-modules-core@1.12.x + AGP 8.3+ :
 *
 * 1. Force Gradle 8.6 dans gradle-wrapper.properties
 *    (EAS Build peut imposer une version plus récente incompatible)
 *
 * 2. Patche ExpoModulesCorePlugin.gradle : remplace `from components.release`
 *    par un accès null-safe `findByName('release')` compatible Gradle 8.x
 */
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

function patchExpoModulesCore(projectRoot) {
  // Résolution Node.js — traverse les node_modules jusqu'à la racine monorepo
  let expoModulesCoreDir
  try {
    const pkg = require.resolve('expo-modules-core/package.json', {
      paths: [projectRoot],
    })
    expoModulesCoreDir = path.dirname(pkg)
  } catch {
    console.warn('[withAndroidBuildFix] expo-modules-core introuvable, patch ignoré')
    return
  }

  const filePath = path.join(expoModulesCoreDir, 'android', 'ExpoModulesCorePlugin.gradle')
  if (!fs.existsSync(filePath)) {
    console.warn('[withAndroidBuildFix] ExpoModulesCorePlugin.gradle introuvable')
    return
  }

  let content = fs.readFileSync(filePath, 'utf8')
  if (content.includes('findByName')) {
    console.log('[withAndroidBuildFix] ExpoModulesCorePlugin.gradle déjà patché')
    return
  }

  const before = `  project.afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`

  const after = `  project.afterEvaluate {
    def releaseComponent = project.components.findByName('release')
    if (releaseComponent != null) {
      publishing {
        publications {
          release(MavenPublication) {
            from releaseComponent
          }
        }
        repositories {
          maven {
            url = mavenLocal().url
          }
        }
      }
    }
  }`

  if (!content.includes(before)) {
    console.warn('[withAndroidBuildFix] Bloc cible non trouvé dans ExpoModulesCorePlugin.gradle')
    return
  }

  fs.writeFileSync(filePath, content.replace(before, after))
  console.log('[withAndroidBuildFix] ✅ ExpoModulesCorePlugin.gradle patché')
}

function forceGradle86(platformProjectRoot) {
  const wrapperPath = path.join(
    platformProjectRoot,
    'gradle',
    'wrapper',
    'gradle-wrapper.properties'
  )

  if (!fs.existsSync(wrapperPath)) {
    console.warn('[withAndroidBuildFix] gradle-wrapper.properties introuvable')
    return
  }

  let content = fs.readFileSync(wrapperPath, 'utf8')
  const updated = content.replace(
    /distributionUrl=.*gradle-[\d.]+-all\.zip/,
    'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.6-all.zip'
  )

  if (content === updated) {
    console.log('[withAndroidBuildFix] Gradle 8.6 déjà configuré')
    return
  }

  fs.writeFileSync(wrapperPath, updated)
  console.log('[withAndroidBuildFix] ✅ Gradle forcé à 8.6 dans gradle-wrapper.properties')
}

module.exports = function withAndroidBuildFix(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest

      // 1. Patch ExpoModulesCorePlugin.gradle (node_modules)
      patchExpoModulesCore(projectRoot)

      // 2. Force Gradle 8.6 (fichier généré dans android/)
      forceGradle86(platformProjectRoot)

      return config
    },
  ])
}
