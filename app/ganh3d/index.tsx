import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { ChevronLeft, RefreshCw, X } from 'lucide-react-native';

const DEFAULT_USERNAME = 'teophan370';
const PASSWORD = '425453600';
const GANH3D_URL = 'https://hoathinh3d.co/';
const GANH3D_BACKUP_URL = 'https://bit.ly/hh3d';
const GANH3D_LOGOUT_URL = new URL('/my-account/user-logout', GANH3D_URL).toString();
const GANH3D_LOGO = 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775824346/ganh3d-removebg-preview_x3cw8x.png';
const LOGOUT_SCRIPT = `
(() => {
  const notify = (ok) => {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'logout-done', ok: !!ok }));
      }
    } catch {
      // Ignore bridge errors.
    }
  };

  try {
    fetch('${GANH3D_LOGOUT_URL}', {
      method: 'GET',
      credentials: 'include',
      mode: 'no-cors',
      cache: 'no-store',
    })
      .catch(() => {})
      .finally(() => notify(true));

    window.location.href = '${GANH3D_LOGOUT_URL}';
  } catch {
    notify(false);
  }
})();
true;
`;
const FULLSCREEN_BRIDGE_SCRIPT = `
(() => {
  const HIDE_SELECTORS = [
    '.badge-settings-float-button',
    '.um-notification-b.right[data-show-always="1"]',
    '#bp-better-messages-mini-mobile-open',
  ];

  const hideIntrusiveUI = () => {
    HIDE_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    });
  };

  hideIntrusiveUI();
  setInterval(hideIntrusiveUI, 700);

  try {
    const obs = new MutationObserver(() => hideIntrusiveUI());
    obs.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'id'],
    });
  } catch {
    // Ignore DOM observe errors on restricted pages.
  }

  const post = (type) => {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type }));
      }
    } catch {
      // Ignore WebView bridge errors.
    }
  };

  const emitFullscreenState = () => {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    post(isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit');
  };

  document.addEventListener('fullscreenchange', emitFullscreenState, true);
  document.addEventListener('webkitfullscreenchange', emitFullscreenState, true);
  document.addEventListener('mozfullscreenchange', emitFullscreenState, true);
  document.addEventListener('MSFullscreenChange', emitFullscreenState, true);

  document.addEventListener('webkitbeginfullscreen', () => post('fullscreen-enter'), true);
  document.addEventListener('webkitendfullscreen', () => post('fullscreen-exit'), true);

  let lastFullscreen = false;

  const readFullscreenState = () => {
    const video = document.querySelector('video');
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      (video && video.webkitDisplayingFullscreen)
    );
  };

  const syncFullscreenState = () => {
    const isFullscreen = readFullscreenState();
    if (isFullscreen === lastFullscreen) return;
    lastFullscreen = isFullscreen;
    post(isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit');
  };

  setInterval(syncFullscreenState, 300);
  window.addEventListener('resize', syncFullscreenState, true);

  const hasFullscreenIntent = (element) => {
    if (!element || !(element instanceof Element)) return false;

    const label = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-title'),
      element.textContent,
      element.className,
      element.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return label.includes('fullscreen') || label.includes('full screen') || label.includes('phóng to') || label.includes('mở rộng') || label.includes('expand');
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const candidate = target?.closest('button, [role="button"], a, div, span, i, svg');
      if (!candidate) return;

      if (hasFullscreenIntent(candidate) || hasFullscreenIntent(target)) {
        // Sync actual state after UI toggles instead of forcing "enter" on every click.
        setTimeout(syncFullscreenState, 100);
        setTimeout(syncFullscreenState, 350);
        setTimeout(syncFullscreenState, 700);
      }
    },
    true
  );

  const patchMethod = (object, name, onCall) => {
    try {
      if (!object || typeof object[name] !== 'function') return;
      const original = object[name];
      object[name] = function() {
        onCall();
        return original.apply(this, arguments);
      };
    } catch {
      // Ignore patch errors from locked browser objects.
    }
  };

  patchMethod(Element.prototype, 'requestFullscreen', () => post('fullscreen-enter'));
  patchMethod(Element.prototype, 'webkitRequestFullscreen', () => post('fullscreen-enter'));
  patchMethod(Element.prototype, 'mozRequestFullScreen', () => post('fullscreen-enter'));
  patchMethod(Element.prototype, 'msRequestFullscreen', () => post('fullscreen-enter'));

  patchMethod(HTMLVideoElement && HTMLVideoElement.prototype, 'webkitEnterFullscreen', () => post('fullscreen-enter'));

  patchMethod(Document.prototype, 'exitFullscreen', () => post('fullscreen-exit'));
  patchMethod(Document.prototype, 'webkitExitFullscreen', () => post('fullscreen-exit'));
  patchMethod(Document.prototype, 'mozCancelFullScreen', () => post('fullscreen-exit'));
  patchMethod(Document.prototype, 'msExitFullscreen', () => post('fullscreen-exit'));
})();
true;
`;

export default function Ganh3dScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const autoLoginDoneRef = useRef<Set<string>>(new Set());
  const logoutTriggeredRef = useRef(false);
  const pendingExitActionRef = useRef<null | (() => void)>(null);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const params = useLocalSearchParams<{ user?: string }>();
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [webUrl, setWebUrl] = useState(GANH3D_URL);
  const [didSwitchToBackupUrl, setDidSwitchToBackupUrl] = useState(false);
    const username = typeof params.user === 'string' && params.user.trim() ? params.user.trim() : DEFAULT_USERNAME;
    const shouldAutoLogin = !autoLoginDoneRef.current.has(username);

  const lockLandscape = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SO = require('expo-screen-orientation');
      await SO.lockAsync(SO.OrientationLock.LANDSCAPE);
    } catch {
      // Ignore if screen orientation module is unavailable.
    }
  };

  const lockPortrait = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SO = require('expo-screen-orientation');
      await SO.lockAsync(SO.OrientationLock.PORTRAIT_UP);
    } catch {
      // Ignore if screen orientation module is unavailable.
    }
  };

  const triggerWebLogout = () => {
    if (logoutTriggeredRef.current) return;
    logoutTriggeredRef.current = true;
    webViewRef.current?.injectJavaScript(LOGOUT_SCRIPT);
  };

  const runPendingExitAction = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }

    const action = pendingExitActionRef.current;
    pendingExitActionRef.current = null;
    if (action) action();
  };

  const logoutAndThen = (action: () => void) => {
    if (logoutTriggeredRef.current) {
      action();
      return;
    }

    pendingExitActionRef.current = action;
    triggerWebLogout();
    logoutTimeoutRef.current = setTimeout(() => {
      runPendingExitAction();
    }, 1300);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBack = () => {
      if (isExpanded) {
        setIsExpanded(false);
        lockPortrait().catch(() => {});
        return true;
      }

      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      logoutAndThen(() => router.back());
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [canGoBack, isExpanded, router]);

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        triggerWebLogout();
      }
    });

    return () => {
      appStateSub.remove();
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      triggerWebLogout();
      lockPortrait().catch(() => {});
    };
  }, []);

  const handleExitToIntro = () => {
    logoutAndThen(() => router.replace('/intro' as any));
  };

  const switchToBackupUrl = () => {
    if (didSwitchToBackupUrl) return;
    setDidSwitchToBackupUrl(true);
    setWebUrl(GANH3D_BACKUP_URL);
    setLoading(true);
  };

    const injectedScript = useMemo(() => {
        const user = JSON.stringify(username);
        const pass = JSON.stringify(PASSWORD);

        if (!shouldAutoLogin) {
            return '';
        }

        autoLoginDoneRef.current.add(username);

        return `
(function() {
  var username = ${user};
  var password = ${pass};
  var attempts = 0;

  function isLoggedIn() {
    return !!document.querySelector('a[href*="user-logout"], a[href*="logout"], .logged-in, .user-logout');
  }

  function openLoginUI() {
    var loginBtn =
      document.getElementById('custom-open-login-modal') ||
      document.querySelector('a[href*="wp-login.php"], a[href*="/login"], a[href*="login"], button[data-action*="login"], button[data-login]');

    if (loginBtn) {
      loginBtn.click();
      return true;
    }

    return false;
  }

  function fillLoginForm() {
    var filled = false;

    document.querySelectorAll('input').forEach(function(i){
      var fieldName = String(i.name || i.id || i.placeholder || '').toLowerCase();

      if (i.type === 'text' || i.type === 'email' || fieldName.includes('user') || fieldName.includes('email') || fieldName.includes('login')) {
        i.value = username;
        i.dispatchEvent(new Event('input', { bubbles: true }));
        i.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
      }

      if (i.type === 'password' || fieldName.includes('pass')) {
        i.value = password;
        i.dispatchEvent(new Event('input', { bubbles: true }));
        i.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
      }
    });

    return filled;
  }

  function submitLoginForm() {
    var submitBtn =
      document.getElementById('custom-login-submit') ||
      document.querySelector('button[type="submit"], input[type="submit"], .login-submit button, .login-submit input, form button:not([type="button"])');

    if (submitBtn) {
      submitBtn.click();
      return true;
    }

    return false;
  }

  function runOnce() {
    if (isLoggedIn()) return true;

    openLoginUI();

    setTimeout(function(){
      if (isLoggedIn()) return;

      fillLoginForm();

      setTimeout(function(){
        if (isLoggedIn()) return;
        submitLoginForm();
      }, 500);
    }, 700);

    return false;
  }

  var timer = setInterval(function(){
    attempts += 1;

    if (runOnce() || attempts > 10) {
      clearInterval(timer);
    }
  }, 900);
})();
true;
`;
    }, [username, shouldAutoLogin]);

    const initialInjectedScript = useMemo(() => {
      const loginScript = injectedScript || 'true;';
      return `${FULLSCREEN_BRIDGE_SCRIPT}\n${loginScript}`;
    }, [injectedScript]);

    const handleWebMessage = (event: any) => {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;

      try {
        const msg = JSON.parse(raw);
        if (msg?.type === 'logout-done') {
          runPendingExitAction();
          return;
        }

        if (msg?.type === 'fullscreen-enter') {
            setIsExpanded(true);
          lockLandscape().catch(() => {});
        } else if (msg?.type === 'fullscreen-exit') {
            setIsExpanded(false);
          lockPortrait().catch(() => {});
        }
      } catch {
        // Ignore non-JSON messages from page scripts.
      }
    };

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.container}>
          {!isExpanded ? (
            <View style={styles.header}>
              <Pressable
                onPress={() => webViewRef.current?.goBack()}
                disabled={!canGoBack}
                style={({ pressed }) => [styles.headerBtn, !canGoBack && styles.headerBtnDisabled, pressed && canGoBack && styles.headerBtnPressed]}
              >
                <ChevronLeft size={18} color={canGoBack ? '#E7EEFF' : '#8EA2D8'} />
              </Pressable>

              <Image source={{ uri: GANH3D_LOGO }} style={styles.headerLogo} contentFit="contain" />

              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => webViewRef.current?.reload()}
                  style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
                >
                  <RefreshCw size={17} color="#E7EEFF" />
                </Pressable>

                <Pressable
                  onPress={handleExitToIntro}
                  style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
                >
                  <X size={17} color="#E7EEFF" />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={[styles.webviewWrap, isExpanded && styles.webviewWrapExpanded]}>
                <WebView
            ref={webViewRef}
                  key={`${username}-${webUrl}`}
            source={{ uri: webUrl }}
                    injectedJavaScriptBeforeContentLoaded={initialInjectedScript}
                    injectedJavaScript={initialInjectedScript}
                  injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
                    startInLoadingState
                  originWhitelist={['*']}
                  setSupportMultipleWindows={false}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  mixedContentMode="always"
                  thirdPartyCookiesEnabled
                  onLoadStart={() => setLoading(true)}
                  onLoadEnd={() => setLoading(false)}
                  onError={switchToBackupUrl}
                  onHttpError={({ nativeEvent }) => {
                    if (nativeEvent.statusCode >= 400) {
                      switchToBackupUrl();
                    }
                  }}
                  onLoadProgress={({ nativeEvent }) => {
                    if (nativeEvent.progress > 0.3) {
                      setLoading(false);
                    }
                  }}
            onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
                  onMessage={handleWebMessage}
                  userAgent={
                    Platform.OS === 'android'
                      ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
                      : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                  }
                    renderLoading={() => (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator size="large" color="#E7C85A" />
                        </View>
                    )}
                />
                {loading ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color="#E7C85A" />
                  </View>
                ) : null}
            </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0A1436',
    },
    container: {
        flex: 1,
        backgroundColor: '#0A1436',
    },
    header: {
      height: 52,
      backgroundColor: '#0F1F4D',
      borderBottomWidth: 1,
      borderBottomColor: '#243A7A',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
    },
    headerLogo: {
      width: 118,
      height: 34,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#152A62',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnDisabled: {
      backgroundColor: '#132350',
    },
    headerBtnPressed: {
      opacity: 0.8,
    },
    webviewWrap: {
      flex: 1,
      position: 'relative',
    },
    webviewWrapExpanded: {
      backgroundColor: '#000000',
    },
    loaderWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A1436',
    },
});
