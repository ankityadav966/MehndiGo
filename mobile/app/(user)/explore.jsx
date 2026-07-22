import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getGlobalStyles } from '../../theme/globalStyles';
import { Colors } from '../../theme/colors';
import { artistService } from '../../services/api';
import { Search, Star, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';

export default function UserExplore() {
  const { theme } = useAuth();
  const styles = getGlobalStyles(theme);
  const colors = Colors[theme];
  
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchArtists = async () => {
    try {
      const res = await artistService.getArtists();
      setArtists(res.data.rows || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchArtists();
  };

  const filteredArtists = artists.filter((artist) => {
    const searchLower = search.toLowerCase();
    const nameMatch = artist.user?.name?.toLowerCase().includes(searchLower);
    const cityMatch = artist.city?.toLowerCase().includes(searchLower);
    return nameMatch || cityMatch;
  });

  const renderArtist = ({ item }) => (
    <View style={[styles.card, { marginBottom: 16 }]}>
      <Image 
        source={{ uri: item.user?.profile_image || "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400" }} 
        style={{ width: '100%', height: 200 }} 
      />
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{item.user?.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={16} color="#ffb300" fill="#ffb300" />
            <Text style={{ fontWeight: '600', color: colors.textPrimary }}>{item.avg_rating || 'New'}</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary }}>{item.city}, {item.state}</Text>
        </View>

        <Text style={{ color: colors.textSecondary, marginTop: 8 }} numberOfLines={2}>
          {item.bio}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
            {item.experience_years} Years Exp.
          </Text>
        </View>

        <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={() => router.push(`/booking?artistId=${item.user?.id || item.user_id}`)}>
          <Text style={styles.btnPrimaryText}>View Profile & Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ padding: 16, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderColor: colors.borderColor }}>
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}>
            <Search size={20} color={colors.textSecondary} />
          </View>
          <TextInput
            style={[styles.input, { paddingLeft: 40, marginBottom: 0 }]}
            placeholder="Search by specialty, bio, or location..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredArtists}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderArtist}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>
              No artists found matching your criteria.
            </Text>
          )
        }
      />
    </View>
  );
}
