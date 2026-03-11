import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle, X } from 'lucide-react-native';

type ToastType = 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const VISIBLE_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const dismiss = useCallback(() => {
    if (animRef.current) animRef.current.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setToast(null)
    );
  }, [opacity]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animRef.current) animRef.current.stop();
    opacity.setValue(0);
    progressAnim.setValue(1);
    setToast({ message, type });

    animRef.current = Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(VISIBLE_MS),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: VISIBLE_MS + 250,
        useNativeDriver: false,
      }),
    ]);
    animRef.current.start();
    timerRef.current = setTimeout(() => setToast(null), VISIBLE_MS + 600);
  }, [opacity, progressAnim]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View style={[styles.toast, { opacity }]}>
          {/* left accent bar */}
          <View style={[styles.accentBar, { backgroundColor: toast.type === 'success' ? '#07bc0c' : '#e74c3c' }]} />

          {/* icon */}
          {toast.type === 'success'
            ? <CheckCircle size={20} color="#07bc0c" style={styles.icon} />
            : <XCircle size={20} color="#e74c3c" style={styles.icon} />}

          {/* message */}
          <Text style={styles.toastText}>{toast.message}</Text>

          {/* close button */}
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#aaa" strokeWidth={2} />
          </TouchableOpacity>

          {/* progress bar */}
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: toast.type === 'success' ? '#07bc0c' : '#e74c3c' },
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: '#2d3748',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 9999,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  icon: { marginLeft: 6 },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 10,
    lineHeight: 18,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 0,
  },
});
