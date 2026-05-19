#!/usr/bin/env node
/**
 * Patch expo-modules-core pour compatibilité AGP 8.3+ / Gradle 8.6+
 * Le composant 'release' est créé lazily et n'est pas accessible via
 * components.release dans afterEvaluate — utiliser findByName() à la place.
 */
const fs = require('fs')
const path = require('path')

const filePath = path.join(
  __dirname,
  '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle'
)

if (!fs.existsSync(filePath)) {
  console.log('[patch] ExpoModulesCorePlugin.gradle introuvable, ignoré')
  process.exit(0)
}

let content = fs.readFileSync(filePath, 'utf8')

if (content.includes('findByName')) {
  console.log('[patch] Déjà appliqué, ignoré')
  process.exit(0)
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
  console.log('[patch] Bloc cible introuvable — le fichier a peut-être déjà été corrigé en amont')
  process.exit(0)
}

content = content.replace(before, after)
fs.writeFileSync(filePath, content)
console.log('[patch] ✅ expo-modules-core/android/ExpoModulesCorePlugin.gradle patché')
