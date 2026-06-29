import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { adminService } from '../../services/api';
import { Check, X, ShieldCheck } from 'lucide-react-native';

export default function AdminPending() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [pendingArtists, setPendingArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPending = async () => {
    try {
      const res = await adminService.getPendingArtists();
      setPendingArtists(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const handleApprove = async (id) => {
    try {
      await adminService.approveArtist(id);
      Alert.alert("Success", "Artist verification approved successfully!");
      fetchPending();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const openRejectModal = (id) => {
    setRejectId(id);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectReason) {
      Alert.alert("Error", "Rejection reason is required");
      return;
    }
    try {
      await adminService.rejectArtist(rejectId, rejectReason);
      Alert.alert("Success", "Artist verification rejected");
      setRejectModalVisible(false);
      fetchPending();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const renderPending = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 16 }]}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{item.user?.name}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Phone: {item.user?.phone}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>Experience: {item.experience_years} Years</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Address: {item.location}, {item.city}, {item.state} ({item.pincode})</Text>

      <View style={{ backgroundColor: colors.bgPrimary, padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.textSecondary, fontSize: 12 }}>Professional Bio:</Text>
        <Text style={{ color: colors.textPrimary, marginTop: 4 }}>{item.bio}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.success, flexDirection: 'row', gap: 8 }]} onPress={() => handleApprove(item.id)}>
          <Check size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.danger, flexDirection: 'row', gap: 8 }]} onPress={() => openRejectModal(item.id)}>
          <X size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingArtists}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPending}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <ShieldCheck size={64} color={colors.success} style={{ marginBottom: 16 }} />
              <Text style={[styles.title, { marginBottom: 8 }]}>All Clear!</Text>
              <Text style={[styles.subtitle, { textAlign: 'center' }]}>There are no pending verification requests.</Text>
            </View>
          )
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={[styles.title, { marginBottom: 16 }]}>Reject Verification</Text>
            <Text style={styles.label}>Reason for rejection</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="E.g., Invalid Aadhaar card..."
              placeholderTextColor={colors.textSecondary}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 }}>
              <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.danger }]} onPress={handleReject}>
                <Text style={styles.btnPrimaryText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
