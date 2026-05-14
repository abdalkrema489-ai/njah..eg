# ProGuard rules for Najah TWA

# Keep TWA launcher activity
-keep class com.google.androidbrowserhelper.** { *; }
-keep class androidx.browser.** { *; }

# Keep all activities
-keep public class * extends android.app.Activity

# Keep app class
-keep class com.najah.app.** { *; }

# Standard Android rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-dontwarn okhttp3.**
-dontwarn okio.**
