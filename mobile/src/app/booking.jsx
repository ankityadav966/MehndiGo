import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getGlobalStyles } from '../theme/globalStyles';
import { Colors } from '../theme/colors';
import { artistService, bookingService } from '../services/api';
import { ChevronLeft, Calendar as CalendarIcon, Clock, CreditCard, Wallet } from 'lucide-react-native';

export default function BookingScreen() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];
  const { artistId } = useLocalSearchParams();

  const [artist, setArtist] = useState(null);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [artistRes, servicesRes] = await Promise.all([
          artistService.getArtistById(artistId),
          artistService.getArtistServices(artistId)
        ]);
        setArtist(artistRes.data);
        setServices(servicesRes.data || []);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Could not load artist details");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (artistId) {
      fetchDetails();
    }
  }, [artistId]);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await artistService.getArtistSlotsByDate(artistId, selectedDate);
        // Filter out booked slots
        const availableSlots = (res.data || []).filter(s => !s.is_booked);
        setSlots(availableSlots);
        setSelectedSlot(null);
      } catch (e) {
        console.error(e);
      }
    };
    if (artistId && selectedDate) {
      fetchSlots();
    }
  }, [artistId, selectedDate]);

  // Generate next 7 days for the date picker
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedSlot) {
      Alert.alert("Error", "Please select a service and time slot.");
      return;
    }

    setBookingLoading(true);
    try {
      const bookingData = {
        artist_id: parseInt(artistId),
        service_id: selectedService.id,
        slot_id: selectedSlot.id,
        address: "Home Address (Registered in Profile)", // Simple fallback for now
        payment_method: paymentMethod,
      };

      const res = await bookingService.createBooking(bookingData);
      
      // If payment is ONLINE, we trigger Cashfree checkout.
      // Since Cashfree requires native modules, we include simulation fallback when run on Expo Go.
      if (paymentMethod === "ONLINE") {
        const { createPaymentSession, verifyPaymentSignature } = require("../services/payment");
        const { CFPaymentGatewayService } = require("react-native-cashfree-pg-sdk");
        const { CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder } = require("cashfree-pg-api-contract");

        let sessionData;
        try {
          console.log("[BOOKING_JSX] Requesting Cashfree payment session for booking ID:", res.data.id || res.data.bookingId);
          sessionData = await createPaymentSession(res.data.id || res.data.bookingId);
          console.log("[BOOKING_JSX] Cashfree session response data:", JSON.stringify(sessionData, null, 2));

          if (!sessionData || !sessionData.payment_session_id) {
            throw new Error("payment_session_id is null, undefined, or empty");
          }
        } catch (sessionErr) {
          console.error("[BOOKING_JSX] Cashfree session creation failed:", sessionErr.message);
          Alert.alert("Payment Error", "Failed to generate Cashfree payment session.");
          return;
        }

<<<<<<< HEAD
        if (sessionData.payment_session_id && (sessionData.payment_session_id.startsWith("session_mock") || sessionData.payment_session_id.startsWith("mock_session") || sessionData.mock_mode)) {
          console.log("[BOOKING_JSX] Mock session detected, triggering simulator payment success flow directly.");
          Alert.alert("Payment Simulation", "Simulating Cashfree Payment Success (Sandbox)...");
          try {
            const verifyPayload = {
              cashfree_order_id: sessionData.order_id,
              payment_session_id: sessionData.payment_session_id
            };
            console.log("[BOOKING_JSX] Calling verifyPaymentSignature in Simulator mode with payload:", JSON.stringify(verifyPayload, null, 2));
            const response = await verifyPaymentSignature(verifyPayload);
            console.log("[BOOKING_JSX] verifyPaymentSignature (Simulator) succeeded. Response:", JSON.stringify(response, null, 2));
            Alert.alert("Success", "Booking Confirmed!", [
              { text: "OK", onPress: () => router.replace('/(user)/bookings') }
            ]);
          } catch (verifyErr) {
            console.error("[BOOKING_JSX] Simulator verification API error:", verifyErr.message, verifyErr);
            Alert.alert("Verification Failed", "Failed to confirm simulated payment signature.");
          }
          return;
        }
=======
        const options = {
          description: `Payment for Booking #${targetBookingId}`,
          image: "https://api.mehndigo.in/logo.png",
          currency: sessionData.currency || "INR",
          key: sessionData.key_id,
          amount: sessionData.amount, // in paise
          name: "MehndiGo",
          order_id: sessionData.order_id,
          theme: { color: "#ff7e5f" }
        };
>>>>>>> 3d724d199dd5257dfe28c46b3e3429559b9d412b

        try {
          const onVerify = async (orderIdVal) => {
            console.log("[BOOKING_JSX] Cashfree Success Callback in booking.jsx. orderIdVal:", orderIdVal);
            try {
              const verifyPayload = {
                cashfree_order_id: orderIdVal,
                payment_session_id: sessionData.payment_session_id
              };
              console.log("[BOOKING_JSX] Calling verifyPaymentSignature with payload:", JSON.stringify(verifyPayload, null, 2));
              const response = await verifyPaymentSignature(verifyPayload);
              console.log("[BOOKING_JSX] verifyPaymentSignature succeeded. Response:", JSON.stringify(response, null, 2));
              Alert.alert("Success", "Booking Confirmed!", [
                { text: "OK", onPress: () => router.replace('/(user)/bookings') }
              ]);
            } catch (verifyErr) {
              console.error("[BOOKING_JSX] Verification API error:", verifyErr.message, verifyErr);
              Alert.alert("Verification Failed", "Failed to confirm payment signature.");
            }
          };

          const onError = (error, orderIdVal) => {
            console.log("Cashfree Error Callback in booking.jsx:", error);
            Alert.alert("Payment Failed", error.message || "Checkout session failed.");
          };

          CFPaymentGatewayService.setCallback({ onVerify, onError });

          const session = new CFSession(
            sessionData.payment_session_id,
            sessionData.order_id,
            CFEnvironment.SANDBOX
          );

          const paymentModes = new CFPaymentComponentBuilder()
            .add(CFPaymentModes.CARD)
            .add(CFPaymentModes.UPI)
            .add(CFPaymentModes.WALLET)
            .add(CFPaymentModes.NET_BANKING)
            .build();

          const theme = new CFThemeBuilder()
            .setNavigationBarBackgroundColor('#ff7e5f')
            .setNavigationBarTextColor('#FFFFFF')
            .setButtonBackgroundColor('#ff7e5f')
            .setButtonTextColor('#FFFFFF')
            .build();

          const dropPayment = new CFDropCheckoutPayment(session, paymentModes, theme);

          CFPaymentGatewayService.doPayment(dropPayment);
        } catch (sdkError) {
          console.log("Cashfree SDK failed (Expo Go fallback). Simulating success...");
          Alert.alert("Payment Simulation", "Simulating Cashfree Payment Success...");
          await verifyPaymentSignature({
            cashfree_order_id: sessionData.order_id,
            payment_session_id: sessionData.payment_session_id
          });
          Alert.alert("Success", "Booking Confirmed!", [
            { text: "OK", onPress: () => router.replace('/(user)/bookings') }
          ]);
        }
        return;
      } else if (paymentMethod === "WALLET") {
        const { payWithWallet } = require("../services/payment");
        await payWithWallet(res.data.id || res.data.bookingId);
        Alert.alert("Success", "Booking Confirmed!", [
          { text: "OK", onPress: () => router.replace('/(user)/bookings') }
        ]);
        return;
      }
    } catch (e) {
      Alert.alert("Booking Failed", e.message || "An error occurred");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary, paddingTop: Platform.OS === 'android' ? 24 : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Book {artist?.user?.name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Step 1: Select Service */}
        <Text style={[styles.title, { fontSize: 18, marginBottom: 16 }]}>1. Select Service</Text>
        {services.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No services available.</Text>
        ) : (
          services.map(svc => (
            <TouchableOpacity 
              key={svc.id} 
              style={[
                styles.glassPanel, 
                { marginBottom: 12, borderWidth: 2, borderColor: selectedService?.id === svc.id ? colors.accent : 'transparent' }
              ]}
              onPress={() => setSelectedService(svc)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{svc.specialization_name}</Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>{svc.duration_minutes} Mins</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accent }}>₹{svc.minimum_price}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Step 2: Select Date */}
        <Text style={[styles.title, { fontSize: 18, marginTop: 24, marginBottom: 16 }]}>2. Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {getNext7Days().map((d, i) => {
            const dateStr = d.toISOString().split('T')[0];
            const isSelected = selectedDate === dateStr;
            return (
              <TouchableOpacity
                key={i}
                style={{
                  width: 60,
                  height: 80,
                  backgroundColor: isSelected ? colors.accent : colors.bgSecondary,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.accent : colors.borderColor
                }}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text style={{ color: isSelected ? '#fff' : colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={{ color: isSelected ? '#fff' : colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Step 3: Select Time Slot */}
        <Text style={[styles.title, { fontSize: 18, marginTop: 24, marginBottom: 16 }]}>3. Select Time</Text>
        {slots.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No available slots for this date.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {slots.map(slot => {
              const start = new Date(slot.start_time);
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={{
                    backgroundColor: isSelected ? colors.success : colors.bgSecondary,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.success : colors.borderColor
                  }}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={{ color: isSelected ? '#fff' : colors.textPrimary, fontWeight: '600' }}>
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 4: Payment Method */}
        <Text style={[styles.title, { fontSize: 18, marginTop: 24, marginBottom: 16 }]}>4. Payment Method</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          <TouchableOpacity
            style={[
              styles.glassPanel,
              { flex: 1, alignItems: 'center', borderWidth: 2, borderColor: paymentMethod === 'ONLINE' ? colors.accent : 'transparent' }
            ]}
            onPress={() => setPaymentMethod('ONLINE')}
          >
            <CreditCard size={24} color={paymentMethod === 'ONLINE' ? colors.accent : colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={{ color: paymentMethod === 'ONLINE' ? colors.accent : colors.textSecondary, fontWeight: '600' }}>Online Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.glassPanel,
              { flex: 1, alignItems: 'center', borderWidth: 2, borderColor: paymentMethod === 'WALLET' ? colors.accent : 'transparent' }
            ]}
            onPress={() => setPaymentMethod('WALLET')}
          >
            <Wallet size={24} color={paymentMethod === 'WALLET' ? colors.accent : colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={{ color: paymentMethod === 'WALLET' ? colors.accent : colors.textSecondary, fontWeight: '600' }}>MehndiGo Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Summary & Book Button */}
        {selectedService && (
          <View style={{ backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.borderColor }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.textSecondary }}>Total Amount:</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>₹{selectedService.minimum_price}</Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking} disabled={bookingLoading || !selectedSlot}>
              {bookingLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
