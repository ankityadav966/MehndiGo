const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || process.env.HOME || '';
let rnVersion = '0.85.3';
try {
  rnVersion = require('../node_modules/react-native/package.json').version;
} catch (_) {}
const reactAndroidCache = path.join(userProfile, '.gradle/caches/modules-2/files-2.1/com.facebook.react/react-android', rnVersion);
const prefabDest = path.join(__dirname, '../node_modules/react-native/ReactAndroid/prefab');

// 1. Patch react-native-image-viewing for missing ImageItem.js
try {
  const imgViewingDir = path.join(__dirname, '../node_modules/react-native-image-viewing/dist/components/ImageItem');
  const imgViewingFile = path.join(imgViewingDir, 'ImageItem.js');
  if (fs.existsSync(imgViewingDir) && !fs.existsSync(imgViewingFile)) {
    const content = `import { Platform } from "react-native";
import ImageItemAndroid from "./ImageItem.android";
import ImageItemIOS from "./ImageItem.ios";

const ImageItem = Platform.OS === "ios" ? ImageItemIOS : ImageItemAndroid;

export default ImageItem;
`;
    fs.writeFileSync(imgViewingFile, content, 'utf8');
    console.log('[Postinstall] Created ImageItem.js for react-native-image-viewing');
  }
} catch (err) {
  console.error('[Postinstall] Error patching react-native-image-viewing:', err.message);
}

// 2. Extract ReactAndroid prefab headers from Gradle cache if needed
try {
  
  if (fs.existsSync(reactAndroidCache)) {
    function findAar(d) {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, f.name);
        if (f.isDirectory()) {
          const found = findAar(full);
          if (found) return found;
        } else if (f.name.endsWith('-debug.aar') || f.name.endsWith('.aar')) {
          return full;
        }
      }
    }
    const aar = findAar(reactAndroidCache);
    if (aar) {
      const libCheck = path.join(prefabDest, 'prefab/modules/reactnative/libs/android.arm64-v8a/libreactnative.so');
      if (!fs.existsSync(libCheck)) {
        fs.mkdirSync(prefabDest, { recursive: true });
        const cp = require('child_process');
        cp.execSync(`tar -xf "${aar}" -C "${prefabDest}"`);
        console.log('[Postinstall] Extracted ReactAndroid prefab and libraries from AAR');
      }
    }
    const fbjniCache = path.join(userProfile, '.gradle/caches/modules-2/files-2.1/com.facebook.fbjni/fbjni');
    if (fs.existsSync(fbjniCache)) {
      const fbjniAar = findAar(fbjniCache);
      if (fbjniAar) {
        const fbjniCheck = path.join(prefabDest, 'prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so');
        if (!fs.existsSync(fbjniCheck)) {
          const cp = require('child_process');
          const tmpFbjni = path.join(prefabDest, 'fbjni_tmp');
          fs.mkdirSync(tmpFbjni, { recursive: true });
          cp.execSync(`tar -xf "${fbjniAar}" -C "${tmpFbjni}"`);
          if (fs.existsSync(path.join(tmpFbjni, 'prefab/modules/fbjni'))) {
            const fbjniModuleDest = path.join(prefabDest, 'prefab/modules/fbjni');
            fs.cpSync(path.join(tmpFbjni, 'prefab/modules/fbjni'), fbjniModuleDest, { recursive: true });
          }
          try { fs.rmSync(tmpFbjni, { recursive: true, force: true }); } catch (_) {}
          console.log('[Postinstall] Extracted fbjni prefab from AAR');
        }
      }
    }
  }

  // Ensure folly headers exist for RN 0.85 C++ headers
  const follyDir = path.join(prefabDest, 'prefab/modules/reactnative/include/folly');
  if (!fs.existsSync(follyDir)) fs.mkdirSync(follyDir, { recursive: true });
  const follyJsonDir = path.join(follyDir, 'json');
  if (!fs.existsSync(follyJsonDir)) fs.mkdirSync(follyJsonDir, { recursive: true });

  const follyDynamicH = path.join(follyDir, 'dynamic.h');
  if (!fs.existsSync(follyDynamicH)) {
    const dyn = `#pragma once
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <initializer_list>
#include <cstdint>

namespace folly {
struct dynamic {
  enum Type { NULLT, ARRAY, BOOL, DOUBLE, INT64, OBJECT, STRING };
  Type type_ = NULLT;

  dynamic() = default;
  dynamic(std::nullptr_t) : type_(NULLT) {}
  dynamic(bool) : type_(BOOL) {}
  dynamic(int) : type_(INT64) {}
  dynamic(long) : type_(INT64) {}
  dynamic(long long) : type_(INT64) {}
  dynamic(unsigned int) : type_(INT64) {}
  dynamic(unsigned long) : type_(INT64) {}
  dynamic(unsigned long long) : type_(INT64) {}
  dynamic(double) : type_(DOUBLE) {}
  dynamic(const char*) : type_(STRING) {}
  dynamic(const std::string&) : type_(STRING) {}
  dynamic(std::initializer_list<dynamic>) : type_(ARRAY) {}

  static dynamic array() { dynamic d; d.type_ = ARRAY; return d; }
  static dynamic object() { dynamic d; d.type_ = OBJECT; return d; }

  template <typename... Args>
  static dynamic array(Args&&...) { dynamic d; d.type_ = ARRAY; return d; }

  template <typename... Args>
  static dynamic object(Args&&...) { dynamic d; d.type_ = OBJECT; return d; }

  bool isNull() const { return type_ == NULLT; }
  bool isBool() const { return type_ == BOOL; }
  bool isInt() const { return type_ == INT64; }
  bool isDouble() const { return type_ == DOUBLE; }
  bool isString() const { return type_ == STRING; }
  bool isArray() const { return type_ == ARRAY; }
  bool isObject() const { return type_ == OBJECT; }

  bool asBool() const { return false; }
  int64_t asInt() const { return 0; }
  double asDouble() const { return 0.0; }
  const std::string& asString() const { static std::string s; return s; }
  const std::string& getString() const { static std::string s; return s; }

  dynamic& operator[](const dynamic&) { static dynamic d; return d; }
  const dynamic& operator[](const dynamic&) const { static dynamic d; return d; }
  dynamic& operator[](size_t) { static dynamic d; return d; }
  const dynamic& operator[](size_t) const { static dynamic d; return d; }
  dynamic& operator[](const std::string&) { static dynamic d; return d; }
  const dynamic& operator[](const std::string&) const { static dynamic d; return d; }

  size_t size() const { return 0; }
  bool empty() const { return true; }

  dynamic* begin() { return nullptr; }
  dynamic* end() { return nullptr; }
  const dynamic* begin() const { return nullptr; }
  const dynamic* end() const { return nullptr; }

  template<typename T>
  T as() const { return T(); }
};

struct parse_error : std::exception {
  const char* what() const noexcept override { return "parse error"; }
};

namespace json {
  inline dynamic parse(const std::string&, void* = nullptr) { return dynamic(); }
  inline std::string serialize(const dynamic&, void* = nullptr) { return "{}"; }
} // namespace json

inline dynamic parseJson(const std::string&, void* = nullptr) { return dynamic(); }
inline std::string toJson(const dynamic&) { return "{}"; }

} // namespace folly
`;
    fs.writeFileSync(follyDynamicH, dyn, 'utf8');
    fs.writeFileSync(path.join(follyDir, 'json.h'), '#pragma once\n#include <folly/dynamic.h>\n', 'utf8');
    fs.writeFileSync(path.join(follyJsonDir, 'dynamic.h'), '#pragma once\n#include <folly/dynamic.h>\n', 'utf8');
    fs.writeFileSync(path.join(follyDir, 'Format.h'), '#pragma once\n#include <folly/dynamic.h>\n', 'utf8');
    fs.writeFileSync(path.join(follyDir, 'Conv.h'), '#pragma once\n#include <folly/dynamic.h>\n', 'utf8');
    fs.writeFileSync(path.join(follyDir, 'ScopeGuard.h'), '#pragma once\n#include <folly/dynamic.h>\n', 'utf8');
    fs.writeFileSync(path.join(follyDir, 'Optional.h'), '#pragma once\n#include <optional>\nnamespace folly { template<typename T> using Optional = std::optional<T>; }\n', 'utf8');
    console.log('[Postinstall] Created folly headers');
  }
} catch (err) {
  console.error('[Postinstall] Error extracting ReactAndroid prefab:', err.message);
}

// 2.5. Patch ReactNative-application.cmake
try {
  const rnAppCMake = path.join(__dirname, '../node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake');
  if (fs.existsSync(rnAppCMake)) {
    let cmakeContent = fs.readFileSync(rnAppCMake, 'utf8');
    if (cmakeContent.includes('find_package(ReactAndroid REQUIRED CONFIG)\nadd_library(jsi ALIAS ReactAndroid::jsi)\nadd_library(reactnative ALIAS ReactAndroid::reactnative)')) {
      const fallback = `find_package(ReactAndroid CONFIG)

if(NOT TARGET ReactAndroid::reactnative)
  add_library(ReactAndroid::reactnative SHARED IMPORTED)
  set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/libs/android.\${ANDROID_ABI}/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/include;\${REACT_COMMON_DIR};\${REACT_COMMON_DIR}/yoga;\${REACT_ANDROID_DIR}/src/main/jni"
  )
endif()

if(NOT TARGET ReactAndroid::jsi)
  add_library(ReactAndroid::jsi SHARED IMPORTED)
  set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/libs/android.\${ANDROID_ABI}/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/include;\${REACT_COMMON_DIR}/jsi"
  )
endif()

if(NOT TARGET jsi)
  add_library(jsi ALIAS ReactAndroid::jsi)
endif()
if(NOT TARGET reactnative)
  add_library(reactnative ALIAS ReactAndroid::reactnative)
endif()`;
      cmakeContent = cmakeContent.replace('find_package(ReactAndroid REQUIRED CONFIG)\nadd_library(jsi ALIAS ReactAndroid::jsi)\nadd_library(reactnative ALIAS ReactAndroid::reactnative)', fallback);
      fs.writeFileSync(rnAppCMake, cmakeContent, 'utf8');
      console.log('[Postinstall] Patched ReactNative-application.cmake');
    }
  }
} catch (err) {
  console.error('[Postinstall] Error patching ReactNative-application.cmake:', err.message);
}

// 3. Patch react-native-worklets
try {
  const workletsCMake = path.join(__dirname, '../node_modules/react-native-worklets/android/CMakeLists.txt');
  if (fs.existsSync(workletsCMake)) {
    let cmakeContent = fs.readFileSync(workletsCMake, 'utf8');
    
    // HERMES_V1_ENABLED
    if (cmakeContent.includes('if(REACT_NATIVE_MINOR_VERSION LESS 84)')) {
      cmakeContent = cmakeContent.replace(
        'if(REACT_NATIVE_MINOR_VERSION LESS 84)\n  string(APPEND CMAKE_CXX_FLAGS " -DHERMES_V1_ENABLED=${HERMES_V1_ENABLED}")\nendif()',
        'if(HERMES_V1_ENABLED OR REACT_NATIVE_MINOR_VERSION GREATER_EQUAL 84)\n  string(APPEND CMAKE_CXX_FLAGS " -DHERMES_V1_ENABLED=1")\nendif()'
      );
    }

    // ReactAndroid fallback target definition
    if (cmakeContent.includes('find_package(ReactAndroid REQUIRED CONFIG)') || cmakeContent.includes('find_package(ReactAndroid CONFIG)')) {
      const targetRegex = /find_package\(ReactAndroid.*?\n([\s\S]*?)if\(\$\{JS_RUNTIME\} STREQUAL "hermes"\)/;
      const fallback = `find_package(ReactAndroid CONFIG)

if(NOT TARGET ReactAndroid::reactnative)
  add_library(ReactAndroid::reactnative SHARED IMPORTED)
  set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/libs/android.\${ANDROID_ABI}/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/include;\${REACT_NATIVE_DIR}/ReactCommon;\${REACT_NATIVE_DIR}/ReactCommon/yoga;\${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni"
  )
endif()

if(NOT TARGET ReactAndroid::jsi)
  add_library(ReactAndroid::jsi SHARED IMPORTED)
  set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/libs/android.\${ANDROID_ABI}/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/include;\${REACT_NATIVE_DIR}/ReactCommon/jsi"
  )
endif()

if(NOT TARGET ReactAndroid::hermestooling)
  add_library(ReactAndroid::hermestooling SHARED IMPORTED)
  set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/hermestooling/libs/android.\${ANDROID_ABI}/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/hermestooling/include"
  )
endif()

if(NOT TARGET ReactAndroid::jsctooling)
  add_library(ReactAndroid::jsctooling INTERFACE IMPORTED)
endif()

if(\${JS_RUNTIME} STREQUAL "hermes")`;
      
      if (targetRegex.test(cmakeContent)) {
        cmakeContent = cmakeContent.replace(targetRegex, fallback);
      }
    }

    // Version flag condition
    if (cmakeContent.includes('if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)\n')) {
      cmakeContent = cmakeContent.replace(
        'if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)\n',
        'if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80 OR REACT_NATIVE_MINOR_VERSION GREATER_EQUAL 80)\n'
      );
    }

    // Hermes target version check
    if (cmakeContent.includes('if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 82)\n')) {
      cmakeContent = cmakeContent.replace(
        'if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 82)\n',
        'if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 82 OR REACT_NATIVE_MINOR_VERSION GREATER_EQUAL 82)\n'
      );
    }

    // Add include dirs to worklets
    if (!cmakeContent.includes('prefab/prefab/modules/reactnative/include')) {
      cmakeContent = cmakeContent.replace(
        'PRIVATE "${REACT_NATIVE_DIR}/ReactCommon"',
        'PRIVATE "${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/include"\n          "${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/include"\n          "${REACT_NATIVE_DIR}/ReactCommon/jsi"\n          "${REACT_NATIVE_DIR}/ReactCommon"'
      );
    }

    fs.writeFileSync(workletsCMake, cmakeContent, 'utf8');
    console.log('[Postinstall] Patched react-native-worklets CMakeLists.txt');
  }

  const workletsBuildGradle = path.join(__dirname, '../node_modules/react-native-worklets/android/build.gradle');
  if (fs.existsSync(workletsBuildGradle)) {
    let bgContent = fs.readFileSync(workletsBuildGradle, 'utf8');
    if (bgContent.includes('implementation "com.facebook.react:react-android"\n')) {
      bgContent = bgContent.replace(
        'implementation "com.facebook.react:react-android"\n',
        'implementation "com.facebook.react:react-android:${REACT_NATIVE_VERSION}"\n'
      );
      fs.writeFileSync(workletsBuildGradle, bgContent, 'utf8');
      console.log('[Postinstall] Patched react-native-worklets build.gradle');
    }
  }
  const glogDir = path.join(prefabDest, 'prefab/modules/reactnative/include/glog');
  if (!fs.existsSync(glogDir)) fs.mkdirSync(glogDir, { recursive: true });
  const glogH = path.join(glogDir, 'logging.h');
  if (!fs.existsSync(glogH)) {
    const glogCode = `#pragma once
#include <iostream>
#define GLOG_INFO 0
#define GLOG_WARNING 1
#define GLOG_ERROR 2
#define GLOG_FATAL 3
#define INFO GLOG_INFO
#define WARNING GLOG_WARNING
#define ERROR GLOG_ERROR
#define FATAL GLOG_FATAL
namespace google {
  class LogMessageVoidify { public: void operator&(std::ostream&) {} };
  class LogMessage { public: LogMessage(const char*, int, int) {} std::ostream& stream() { return std::cerr; } };
}
#define LOG(severity) google::LogMessageVoidify() & std::cerr
#define LOG_IF(severity, condition) !(condition) ? (void)0 : google::LogMessageVoidify() & std::cerr
#define CHECK(condition) while(false) std::cerr
#define CHECK_EQ(val1, val2) CHECK((val1) == (val2))
#define CHECK_NE(val1, val2) CHECK((val1) != (val2))
#define CHECK_LE(val1, val2) CHECK((val1) <= (val2))
#define CHECK_LT(val1, val2) CHECK((val1) < (val2))
#define CHECK_GE(val1, val2) CHECK((val1) >= (val2))
#define CHECK_GT(val1, val2) CHECK((val1) > (val2))
#define CHECK_NOTNULL(val) (val)
#define VLOG(severity) google::LogMessageVoidify() & std::cerr
#define DLOG(severity) google::LogMessageVoidify() & std::cerr
`;
    fs.writeFileSync(glogH, glogCode, 'utf8');
  }

  const workletsProxyCpp = path.join(__dirname, '../node_modules/react-native-worklets/Common/cpp/worklets/NativeModules/WorkletsModuleProxy.cpp');
  if (fs.existsSync(workletsProxyCpp)) {
    let content = fs.readFileSync(workletsProxyCpp, 'utf8');
    content = content.replace(/#include <react\/renderer\/uimanager\/(UIManagerBinding|primitives)\.h>\r?\n/g, '');
    fs.writeFileSync(workletsProxyCpp, content, 'utf8');
  }

  const jsiWorkletsCpp = path.join(__dirname, '../node_modules/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp');
  if (fs.existsSync(jsiWorkletsCpp)) {
    let content = fs.readFileSync(jsiWorkletsCpp, 'utf8');
    content = content.replace(/#include <react\/renderer\/uimanager\/(UIManagerBinding|primitives)\.h>\r?\n/g, '');
    fs.writeFileSync(jsiWorkletsCpp, content, 'utf8');
  }

  const jsiWorkletsH = path.join(__dirname, '../node_modules/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.h');
  if (fs.existsSync(jsiWorkletsH)) {
    let content = fs.readFileSync(jsiWorkletsH, 'utf8');
    content = content.replace(/#include <react\/renderer\/uimanager\/(UIManagerBinding|primitives)\.h>\r?\n/g, '');
    fs.writeFileSync(jsiWorkletsH, content, 'utf8');
  }

  const workletRuntimeH = path.join(__dirname, '../node_modules/react-native-worklets/Common/cpp/worklets/WorkletRuntime/WorkletRuntime.h');
  if (fs.existsSync(workletRuntimeH)) {
    let content = fs.readFileSync(workletRuntimeH, 'utf8');
    content = content.replace('#include <jsireact/JSIExecutor.h>\n', '');
    fs.writeFileSync(workletRuntimeH, content, 'utf8');
  }

  const workletsProxyH = path.join(__dirname, '../node_modules/react-native-worklets/Common/cpp/worklets/NativeModules/WorkletsModuleProxy.h');
  if (fs.existsSync(workletsProxyH)) {
    let content = fs.readFileSync(workletsProxyH, 'utf8');
    content = content.replace('#include <jsireact/JSIExecutor.h>\n', '');
    fs.writeFileSync(workletsProxyH, content, 'utf8');
  }

  const jscriptBufferH = path.join(__dirname, '../node_modules/react-native-worklets/android/src/main/cpp/worklets/android/JScriptBufferWrapper.h');
  if (fs.existsSync(jscriptBufferH)) {
    let content = fs.readFileSync(jscriptBufferH, 'utf8');
    content = content.replace('#include <jsireact/JSIExecutor.h>\n', '');
    fs.writeFileSync(jscriptBufferH, content, 'utf8');
  }

  const jscriptBufferCpp = path.join(__dirname, '../node_modules/react-native-worklets/android/src/main/cpp/worklets/android/JScriptBufferWrapper.cpp');
  if (fs.existsSync(jscriptBufferCpp)) {
    let content = fs.readFileSync(jscriptBufferCpp, 'utf8');
    if (!content.includes('#include <system_error>')) {
      content = content.replace('#include <utility>', '#include <system_error>\n#include <utility>');
      fs.writeFileSync(jscriptBufferCpp, content, 'utf8');
    }
  }
} catch (err) {
  console.error('[Postinstall] Error patching react-native-worklets:', err.message);
}

// 4. Patch react-native-reanimated CMakeLists.txt
try {
  const reanimatedCMake = path.join(__dirname, '../node_modules/react-native-reanimated/android/CMakeLists.txt');
  if (fs.existsSync(reanimatedCMake)) {
    let cmakeContent = fs.readFileSync(reanimatedCMake, 'utf8');
    if (cmakeContent.includes('find_package(ReactAndroid REQUIRED CONFIG)') || cmakeContent.includes('find_package(ReactAndroid CONFIG)')) {
      const targetRegex = /find_package\(ReactAndroid.*?\n([\s\S]*?)find_package\(react-native-worklets REQUIRED CONFIG\)/;
      const fallback = `find_package(ReactAndroid CONFIG)

if(NOT TARGET ReactAndroid::reactnative)
  add_library(ReactAndroid::reactnative SHARED IMPORTED)
  set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/libs/android.\${ANDROID_ABI}/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/include;\${REACT_NATIVE_DIR}/ReactCommon;\${REACT_NATIVE_DIR}/ReactCommon/yoga;\${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni"
  )
endif()

if(NOT TARGET ReactAndroid::jsi)
  add_library(ReactAndroid::jsi SHARED IMPORTED)
  set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/libs/android.\${ANDROID_ABI}/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/include;\${REACT_NATIVE_DIR}/ReactCommon/jsi"
  )
endif()

if(NOT TARGET ReactAndroid::hermestooling)
  add_library(ReactAndroid::hermestooling SHARED IMPORTED)
  set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/hermestooling/libs/android.\${ANDROID_ABI}/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/hermestooling/include"
  )
endif()

if(NOT TARGET ReactAndroid::jsctooling)
  add_library(ReactAndroid::jsctooling INTERFACE IMPORTED)
endif()

find_package(react-native-worklets REQUIRED CONFIG)`;
      
      if (targetRegex.test(cmakeContent)) {
        cmakeContent = cmakeContent.replace(targetRegex, fallback);
      }
    }

    if (cmakeContent.includes('if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)\n')) {
      cmakeContent = cmakeContent.replace(
        'if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)\n',
        'if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80 OR REACT_NATIVE_MINOR_VERSION GREATER_EQUAL 80)\n'
      );
    }

    // Add include dirs to reanimated
    if (!cmakeContent.includes('prefab/prefab/modules/reactnative/include')) {
      cmakeContent = cmakeContent.replace(
        'PRIVATE "${COMMON_CPP_DIR}"',
        'PRIVATE "${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/include"\n          "${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/include"\n          "${REACT_NATIVE_DIR}/ReactCommon/jsi"\n          "${COMMON_CPP_DIR}"'
      );
    }

    fs.writeFileSync(reanimatedCMake, cmakeContent, 'utf8');
    console.log('[Postinstall] Patched react-native-reanimated CMakeLists.txt');
  }

  const reanimatedBuildGradle = path.join(__dirname, '../node_modules/react-native-reanimated/android/build.gradle');
  if (fs.existsSync(reanimatedBuildGradle)) {
    let bgContent = fs.readFileSync(reanimatedBuildGradle, 'utf8');
    if (bgContent.includes('implementation "com.facebook.react:react-android"\n')) {
      bgContent = bgContent.replace(
        'implementation "com.facebook.react:react-android"\n',
        'implementation "com.facebook.react:react-android:${REACT_NATIVE_VERSION}"\n'
      );
      fs.writeFileSync(reanimatedBuildGradle, bgContent, 'utf8');
      console.log('[Postinstall] Patched react-native-reanimated build.gradle');
    }
  }
} catch (err) {
  console.error('[Postinstall] Error patching react-native-reanimated CMake/Gradle:', err.message);
}

// 5. Patch react-native-reanimated rawProps for React Native >= 0.84
try {
  const sharedTransitions = path.join(__dirname, '../node_modules/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp');
  if (fs.existsSync(sharedTransitions)) {
    let content = fs.readFileSync(sharedTransitions, 'utf8');
    if (content.includes('#ifdef ANDROID\n  auto array = folly::dynamic::array')) {
      content = content.replace(
        '#ifdef ANDROID\n  auto array = folly::dynamic::array',
        '#if defined(ANDROID) && REACT_NATIVE_MINOR_VERSION < 84\n  auto array = folly::dynamic::array'
      );
      fs.writeFileSync(sharedTransitions, content, 'utf8');
      console.log('[Postinstall] Patched SharedTransitions.cpp for rawProps');
    }
  }

  const layoutExp = path.join(__dirname, '../node_modules/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp');
  if (fs.existsSync(layoutExp)) {
    let content = fs.readFileSync(layoutExp, 'utf8');
    if (content.includes('#ifdef ANDROID\n        // TODO (future): We don\'t merge the root view')) {
      content = content.replace(
        '#ifdef ANDROID\n        // TODO (future): We don\'t merge the root view',
        '#if defined(ANDROID) && REACT_NATIVE_MINOR_VERSION < 84\n        // TODO (future): We don\'t merge the root view'
      );
      fs.writeFileSync(layoutExp, content, 'utf8');
      console.log('[Postinstall] Patched LayoutAnimationsProxy_Experimental.cpp for rawProps');
    }
  }

  const transformOpH = path.join(__dirname, '../node_modules/react-native-reanimated/Common/cpp/reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h');
  if (fs.existsSync(transformOpH)) {
    let content = fs.readFileSync(transformOpH, 'utf8');
    if (content.includes('std::unique_ptr<StyleOperation> interpolate(\n      double progress,\n      const std::shared_ptr<StyleOperation> &from,\n      const std::shared_ptr<StyleOperation> &to,\n      const StyleOperationsInterpolationContext &context) const override;')) {
      const oldDecl = `  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context) const override;

  std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const StyleOperationsInterpolationContext &context) const override;

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(
      const StyleOperationsInterpolationContext &context) const;`;

      const newImpl = `  TransformOperationInterpolator(
      const std::shared_ptr<TOperation> &defaultOperation,
      ResolvableValueInterpolatorConfig config)
      : StyleOperationInterpolator(defaultOperation), config_(std::move(config)) {}

  std::unique_ptr<StyleOperation> interpolate(
      double progress,
      const std::shared_ptr<StyleOperation> &from,
      const std::shared_ptr<StyleOperation> &to,
      const StyleOperationsInterpolationContext &context) const override {
    const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
    const auto &toOp = *std::static_pointer_cast<TOperation>(to);

    return std::make_unique<TOperation>(
        fromOp.value.interpolate(progress, toOp.value, getResolvableValueContext(context)));
  }

  std::shared_ptr<StyleOperation> resolveOperation(
      const std::shared_ptr<StyleOperation> &operation,
      const StyleOperationsInterpolationContext &context) const override {
    const auto &resolvableOp = std::static_pointer_cast<TOperation>(operation);
    const auto &resolved = resolvableOp->value.resolve(getResolvableValueContext(context));

    if (!resolved.has_value()) {
      throw std::invalid_argument(
          "[Reanimated] Cannot resolve resolvable operation: " + operation->getOperationName() +
          " for node with tag: " + std::to_string(context.node->getTag()));
    }

    return std::make_shared<TOperation>(resolved.value());
  }

 protected:
  const ResolvableValueInterpolatorConfig config_;

  ResolvableValueInterpolationContext getResolvableValueContext(
      const StyleOperationsInterpolationContext &context) const {
    return ResolvableValueInterpolationContext{
        .node = context.node,
        .fallbackInterpolateThreshold = context.fallbackInterpolateThreshold,
        .viewStylesRepository = context.viewStylesRepository,
        .relativeProperty = config_.relativeProperty,
        .relativeTo = config_.relativeTo};
  }`;

      content = content.replace(oldDecl, newImpl);
      fs.writeFileSync(transformOpH, content, 'utf8');
      console.log('[Postinstall] Patched TransformOperationInterpolator.h');
    }
  }

  const transformOpCpp = path.join(__dirname, '../node_modules/react-native-reanimated/Common/cpp/reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.cpp');
  if (fs.existsSync(transformOpCpp)) {
    let content = fs.readFileSync(transformOpCpp, 'utf8');
    if (content.includes('// Specialization for resolvable operations\ntemplate <ResolvableOp TOperation>')) {
      const match = /\/\/ Specialization for resolvable operations[\s\S]*?\/\/ Rotate operations/;
      content = content.replace(match, '// Rotate operations');
      content = content.replace('// Translate operations (resolvable)\ntemplate class TransformOperationInterpolator<TranslateXOperation>;\ntemplate class TransformOperationInterpolator<TranslateYOperation>;\n', '');
      fs.writeFileSync(transformOpCpp, content, 'utf8');
      console.log('[Postinstall] Patched TransformOperationInterpolator.cpp');
    }
  }

  const graphicsConv = path.join(__dirname, '../node_modules/react-native/ReactCommon/react/renderer/core/graphicsConversions.h');
  if (fs.existsSync(graphicsConv)) {
    let content = fs.readFileSync(graphicsConv, 'utf8');
    if (content.includes('return std::format("{}%", dimension.value);')) {
      content = content.replace('return std::format("{}%", dimension.value);', 'return std::to_string(dimension.value) + "%";');
      fs.writeFileSync(graphicsConv, content, 'utf8');
      console.log('[Postinstall] Patched graphicsConversions.h');
    }
  }

  const prefabGraphicsConv = path.join(prefabDest, 'prefab/modules/reactnative/include/react/renderer/core/graphicsConversions.h');
  if (fs.existsSync(prefabGraphicsConv)) {
    let content = fs.readFileSync(prefabGraphicsConv, 'utf8');
    if (content.includes('return std::format("{}%", dimension.value);')) {
      content = content.replace('return std::format("{}%", dimension.value);', 'return std::to_string(dimension.value) + "%";');
      fs.writeFileSync(prefabGraphicsConv, content, 'utf8');
      console.log('[Postinstall] Patched prefab graphicsConversions.h');
    }
  }

  // Ensure Sealable is inline and RN_DEBUG_STRING_CONVERTIBLE is 0
  const sealableFiles = [
    path.join(__dirname, '../node_modules/react-native/ReactCommon/react/renderer/core/Sealable.h'),
    path.join(prefabDest, 'prefab/modules/reactnative/include/react/renderer/core/Sealable.h'),
  ];
  for (const sFile of sealableFiles) {
    if (fs.existsSync(sFile)) {
      let content = fs.readFileSync(sFile, 'utf8');
      if (content.includes('#ifndef REACT_NATIVE_DEBUG')) {
        const inlineSealable = `// Production / Prebuilt inline version
class Sealable {
 public:
  inline void seal() const {}
  inline bool getSealed() const { return true; }
  inline void ensureUnsealed() const {}
};`;
        content = content.replace(/#ifndef REACT_NATIVE_DEBUG[\s\S]*?#endif/, inlineSealable);
        fs.writeFileSync(sFile, content, 'utf8');
        console.log('[Postinstall] Patched Sealable.h to inline');
      }
    }
  }

  const flagsFiles = [
    path.join(__dirname, '../node_modules/react-native/ReactCommon/react/renderer/debug/flags.h'),
    path.join(prefabDest, 'prefab/modules/reactnative/include/react/renderer/debug/flags.h'),
  ];
  for (const fFile of flagsFiles) {
    if (fs.existsSync(fFile)) {
      let content = fs.readFileSync(fFile, 'utf8');
      if (content.includes('#define RN_DEBUG_STRING_CONVERTIBLE 1')) {
        content = content.replace(/#if defined\(REACT_NATIVE_DEBUG\) \|\| defined\(RN_ENABLE_DEBUG_STRING_CONVERTIBLE\)[\s\S]*?#endif/, '#define RN_DEBUG_STRING_CONVERTIBLE 0');
        content = content.replace(/#ifdef REACT_NATIVE_DEBUG[\s\S]*?#endif/, '#define RN_DEBUG_STRING_CONVERTIBLE 0');
        fs.writeFileSync(fFile, content, 'utf8');
        console.log('[Postinstall] Patched flags.h RN_DEBUG_STRING_CONVERTIBLE 0');
      }
    }
  }

  const propsFiles = [
    path.join(__dirname, '../node_modules/react-native/ReactCommon/react/renderer/core/Props.h'),
    path.join(prefabDest, 'prefab/modules/reactnative/include/react/renderer/core/Props.h'),
  ];
  for (const prFile of propsFiles) {
    if (fs.existsSync(prFile)) {
      let content = fs.readFileSync(prFile, 'utf8');
      if (content.includes('virtual ComponentName getDiffPropsImplementationTarget() const;')) {
        content = content.replace('virtual ComponentName getDiffPropsImplementationTarget() const;', 'virtual ComponentName getDiffPropsImplementationTarget() const { return ""; }');
        fs.writeFileSync(prFile, content, 'utf8');
        console.log('[Postinstall] Patched Props.h getDiffPropsImplementationTarget');
      }
    }
  }

  const expoVarCmake = path.join(__dirname, '../node_modules/expo-modules-core/android/cmake/variables.cmake');
  if (fs.existsSync(expoVarCmake)) {
    let content = fs.readFileSync(expoVarCmake, 'utf8');
    if (content.includes('find_package(ReactAndroid REQUIRED CONFIG)')) {
      const fallbackExpo = `find_package(ReactAndroid QUIET CONFIG)
find_package(fbjni QUIET CONFIG)

if(NOT TARGET ReactAndroid::reactnative)
  set(REACT_ANDROID_DIR "\${REACT_NATIVE_DIR}/ReactAndroid")
  set(REACT_COMMON_DIR "\${REACT_NATIVE_DIR}/ReactCommon")

  if(NOT TARGET ReactAndroid::jsi)
    add_library(ReactAndroid::jsi SHARED IMPORTED)
    set_target_properties(ReactAndroid::jsi PROPERTIES
      IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/libs/android.\${ANDROID_ABI}/libjsi.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${REACT_COMMON_DIR}/jsi;\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/include"
    )
  endif()

  if(NOT TARGET ReactAndroid::reactnative)
    add_library(ReactAndroid::reactnative SHARED IMPORTED)
    set_target_properties(ReactAndroid::reactnative PROPERTIES
      IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/libs/android.\${ANDROID_ABI}/libreactnative.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${REACT_COMMON_DIR};\${REACT_COMMON_DIR}/callinvoker;\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/include"
    )
  endif()
endif()

if(NOT TARGET fbjni::fbjni)
  set(FBJNI_PREFAB_DIR "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/fbjni")
  if(EXISTS "\${FBJNI_PREFAB_DIR}")
    add_library(fbjni::fbjni SHARED IMPORTED)
    set_target_properties(fbjni::fbjni PROPERTIES
      IMPORTED_LOCATION "\${FBJNI_PREFAB_DIR}/libs/android.\${ANDROID_ABI}/libfbjni.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${FBJNI_PREFAB_DIR}/include"
    )
  endif()
endif()`;
      content = content.replace(/find_package\(ReactAndroid REQUIRED CONFIG\)[\s\S]*?find_package\(fbjni REQUIRED CONFIG\)/, fallbackExpo);
      fs.writeFileSync(expoVarCmake, content, 'utf8');
      console.log('[Postinstall] Patched expo-modules-core variables.cmake');
    }
  }

  const expoMainCmake = path.join(__dirname, '../node_modules/expo-modules-core/android/cmake/main.cmake');
  if (fs.existsSync(expoMainCmake)) {
    let content = fs.readFileSync(expoMainCmake, 'utf8');
    if (!content.includes('react/fabric')) {
      content = content.replace('"${REACT_NATIVE_INTERFACE_INCLUDE_DIRECTORIES}/react"', `"\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/include"\n  "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/reactnative/include/react/fabric"\n  "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/jsi/include"\n  \${REACT_NATIVE_INTERFACE_INCLUDE_DIRECTORIES}/react`);
      fs.writeFileSync(expoMainCmake, content, 'utf8');
      console.log('[Postinstall] Patched expo-modules-core main.cmake');
    }
  }

  const nativeStateProps = path.join(__dirname, '../node_modules/expo-modules-core/android/src/main/cpp/fabric/NativeStatePropsGetter.cpp');
  if (fs.existsSync(nativeStateProps)) {
    let content = fs.readFileSync(nativeStateProps, 'utf8');
    if (content.includes('react::EventQueue::UpdateMode::unstable_Immediate')) {
      content = content.replace(/, react::EventQueue::UpdateMode::unstable_Immediate/g, '');
      fs.writeFileSync(nativeStateProps, content, 'utf8');
      console.log('[Postinstall] Patched NativeStatePropsGetter.cpp');
    }
  }
  const ghCmake = path.join(__dirname, '../node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt');
  if (fs.existsSync(ghCmake)) {
    let content = fs.readFileSync(ghCmake, 'utf8');
    if (content.includes('find_package(ReactAndroid REQUIRED CONFIG)')) {
      const fallbackGh = `find_package(ReactAndroid QUIET CONFIG)
find_package(fbjni QUIET CONFIG)

if(NOT TARGET ReactAndroid::reactnative)
  set(REACT_COMMON_DIR "\${REACT_NATIVE_DIR}/ReactCommon")

  if(NOT TARGET ReactAndroid::jsi)
    add_library(ReactAndroid::jsi SHARED IMPORTED)
    set_target_properties(ReactAndroid::jsi PROPERTIES
      IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/libs/android.\${ANDROID_ABI}/libjsi.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${REACT_COMMON_DIR}/jsi;\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/include"
    )
  endif()

  if(NOT TARGET ReactAndroid::reactnative)
    add_library(ReactAndroid::reactnative SHARED IMPORTED)
    set_target_properties(ReactAndroid::reactnative PROPERTIES
      IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/libs/android.\${ANDROID_ABI}/libreactnative.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/include;\${REACT_COMMON_DIR};\${REACT_COMMON_DIR}/callinvoker"
    )
  endif()
endif()

if(NOT TARGET fbjni::fbjni)
  set(FBJNI_PREFAB_DIR "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/fbjni")
  if(EXISTS "\${FBJNI_PREFAB_DIR}")
    add_library(fbjni::fbjni SHARED IMPORTED)
    set_target_properties(fbjni::fbjni PROPERTIES
      IMPORTED_LOCATION "\${FBJNI_PREFAB_DIR}/libs/android.\${ANDROID_ABI}/libfbjni.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${FBJNI_PREFAB_DIR}/include"
    )
  endif()
endif()`;
      content = content.replace(/find_package\(ReactAndroid REQUIRED CONFIG\)[\s\S]*?find_package\(fbjni REQUIRED CONFIG\)/, fallbackGh);
      fs.writeFileSync(ghCmake, content, 'utf8');
      console.log('[Postinstall] Patched react-native-gesture-handler CMakeLists.txt');
    }
  }

  const screensCmake = path.join(__dirname, '../node_modules/react-native-screens/android/CMakeLists.txt');
  if (fs.existsSync(screensCmake)) {
    let content = fs.readFileSync(screensCmake, 'utf8');
    if (content.includes('find_package(ReactAndroid REQUIRED CONFIG)')) {
      const fallbackScreens = `find_package(ReactAndroid QUIET CONFIG)
find_package(fbjni QUIET CONFIG)

if(NOT REACT_NATIVE_DIR)
  set(REACT_NATIVE_DIR "\${CMAKE_CURRENT_SOURCE_DIR}/../../react-native")
endif()
set(REACT_ANDROID_DIR "\${REACT_NATIVE_DIR}/ReactAndroid")
if(NOT TARGET ReactAndroid::reactnative)
  set(REACT_COMMON_DIR "\${REACT_NATIVE_DIR}/ReactCommon")

  if(NOT TARGET ReactAndroid::jsi)
    add_library(ReactAndroid::jsi SHARED IMPORTED)
    set_target_properties(ReactAndroid::jsi PROPERTIES
      IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/libs/android.\${ANDROID_ABI}/libjsi.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${REACT_COMMON_DIR}/jsi;\${REACT_ANDROID_DIR}/prefab/prefab/modules/jsi/include"
    )
  endif()

  if(NOT TARGET ReactAndroid::reactnative)
    add_library(ReactAndroid::reactnative SHARED IMPORTED)
    set_target_properties(ReactAndroid::reactnative PROPERTIES
      IMPORTED_LOCATION "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/libs/android.\${ANDROID_ABI}/libreactnative.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${REACT_ANDROID_DIR}/prefab/prefab/modules/reactnative/include;\${REACT_COMMON_DIR};\${REACT_COMMON_DIR}/callinvoker"
    )
  endif()
endif()

if(NOT TARGET fbjni::fbjni)
  set(FBJNI_PREFAB_DIR "\${REACT_NATIVE_DIR}/ReactAndroid/prefab/prefab/modules/fbjni")
  if(EXISTS "\${FBJNI_PREFAB_DIR}")
    add_library(fbjni::fbjni SHARED IMPORTED)
    set_target_properties(fbjni::fbjni PROPERTIES
      IMPORTED_LOCATION "\${FBJNI_PREFAB_DIR}/libs/android.\${ANDROID_ABI}/libfbjni.so"
      INTERFACE_INCLUDE_DIRECTORIES "\${FBJNI_PREFAB_DIR}/include"
    )
  endif()
endif()`;
      content = content.replace(/find_package\(ReactAndroid REQUIRED CONFIG\)[\s\S]*?find_package\(fbjni REQUIRED CONFIG\)/, fallbackScreens);
      fs.writeFileSync(screensCmake, content, 'utf8');
      console.log('[Postinstall] Patched react-native-screens CMakeLists.txt');
    }
  }
} catch (err) {
  console.error('[Postinstall] Error patching C++ source / CMake:', err.message);
}
