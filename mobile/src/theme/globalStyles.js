import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const getGlobalStyles = (theme = 'dark') => {
  const colors = Colors[theme];
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    glassPanel: {
      backgroundColor: colors.glassBg,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.bgPrimary,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    btnPrimary: {
      backgroundColor: colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimaryText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    btnSecondary: {
      backgroundColor: colors.bgTertiary,
      borderColor: colors.borderColor,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecondaryText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 16,
    },
    card: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderColor,
      overflow: 'hidden',
    }
  });
};
