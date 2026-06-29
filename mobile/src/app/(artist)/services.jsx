import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Trash2, Edit2, Plus } from 'lucide-react-native';

export default function ArtistServices() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Bridal");
  const [servicePrice, setServicePrice] = useState("1000");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [serviceDesc, setServiceDesc] = useState("");

  const fetchServices = async () => {
    try {
      const res = await artistService.getServices();
      setServices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleSaveService = async () => {
    if (!serviceName || !servicePrice || !serviceDuration) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }
    setServiceLoading(true);
    try {
      const payload = {
        specialization_name: serviceName,
        category: serviceCategory,
        minimum_price: parseInt(servicePrice),
        duration_minutes: parseInt(serviceDuration),
        description: serviceDesc,
      };

      if (editingServiceId) {
        await artistService.updateService(editingServiceId, payload);
        Alert.alert("Success", "Service updated successfully!");
      } else {
        await artistService.createService(payload);
        Alert.alert("Success", "Service added successfully!");
      }
      
      setModalVisible(false);
      fetchServices();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setServiceLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingServiceId(null);
    setServiceName("");
    setServiceCategory("Bridal");
    setServicePrice("1000");
    setServiceDuration("60");
    setServiceDesc("");
    setModalVisible(true);
  };

  const openEditModal = (svc) => {
    setEditingServiceId(svc.id);
    setServiceName(svc.specialization_name);
    setServiceCategory(svc.category);
    setServicePrice(svc.minimum_price.toString());
    setServiceDuration(svc.duration_minutes.toString());
    setServiceDesc(svc.description || "");
    setModalVisible(true);
  };

  const handleDeleteService = async (id) => {
    try {
      await artistService.deleteService(id);
      Alert.alert("Success", "Service deleted");
      fetchServices();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const renderService = ({ item }) => (
    <View style={[styles.glassPanel, { marginBottom: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
            {item.specialization_name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
            {item.category} • {item.duration_minutes} Mins
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent }}>
          ₹{item.minimum_price}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <TouchableOpacity style={[styles.btnSecondary, { flex: 1, flexDirection: 'row', gap: 8 }]} onPress={() => openEditModal(item)}>
          <Edit2 size={16} color={colors.textPrimary} />
          <Text style={styles.btnSecondaryText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnSecondary, { flex: 1, flexDirection: 'row', gap: 8, borderColor: colors.danger }]} onPress={() => handleDeleteService(item.id)}>
          <Trash2 size={16} color={colors.danger} />
          <Text style={[styles.btnSecondaryText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderService}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>
              Your service catalog is empty.
            </Text>
          )
        }
      />
      
      <TouchableOpacity 
        style={[styles.btnPrimary, { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', padding: 0 }]} 
        onPress={openAddModal}
      >
        <Plus size={30} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <ScrollView>
              <Text style={[styles.title, { marginBottom: 20 }]}>{editingServiceId ? 'Edit Service' : 'Add Service'}</Text>
              
              <Text style={styles.label}>Service Name</Text>
              <TextInput style={styles.input} value={serviceName} onChangeText={setServiceName} placeholder="e.g. Bridal Mehndi" placeholderTextColor={colors.textSecondary} />

              <Text style={styles.label}>Category</Text>
              <TextInput style={styles.input} value={serviceCategory} onChangeText={setServiceCategory} placeholder="e.g. Bridal, Arabic" placeholderTextColor={colors.textSecondary} />

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₹)</Text>
                  <TextInput style={styles.input} value={servicePrice} onChangeText={setServicePrice} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (Mins)</Text>
                  <TextInput style={styles.input} value={serviceDuration} onChangeText={setServiceDuration} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={serviceDesc} onChangeText={setServiceDesc} placeholder="Service description..." placeholderTextColor={colors.textSecondary} />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 }}>
                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={handleSaveService} disabled={serviceLoading}>
                  {serviceLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
