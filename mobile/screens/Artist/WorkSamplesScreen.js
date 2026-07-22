import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import Colors from "../../constants/Colors";

export default function WorkSamplesScreen({ navigation }) {
  const [samples, setSamples] = useState([]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) setSamples([...samples, ...result.assets]);
  };

  const removeItem = (index) => {
    const updated = [...samples];
    updated.splice(index, 1);
    setSamples(updated);
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.mediaCard}>
      {item.type === "video" ? (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={35} color={Colors.primary} />
        </View>
      ) : (
        <Image source={{ uri: item.uri }} style={styles.mediaImage} />
      )}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeItem(index)}
      >
        <Ionicons name="close" size={14} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Work Samples</Text>
        <Text style={styles.subHeading}>
          Upload photos and videos of your best work.
        </Text>

        <TouchableOpacity style={styles.uploadBox} onPress={pickMedia}>
          <Ionicons name="images-outline" size={55} color={Colors.primary} />
          <Text style={styles.uploadTitle}>Upload Photos & Videos</Text>
          <Text style={styles.uploadSubTitle}>Showcase your portfolio</Text>
        </TouchableOpacity>

        {samples.length > 0 && (
          <>
            <Text style={styles.previewTitle}>Uploaded Samples</Text>
            <FlatList
              data={samples}
              renderItem={renderItem}
              keyExtractor={(_, index) => index.toString()}
              numColumns={3}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>

      <View style={styles.footer}>
        <CustomButton
          title="Continue"
          onPress={() => navigation.navigate("ReviewSubmit")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  subHeading: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20 },
  uploadBox: {
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight + "20",
    borderWidth: 1,
    borderColor: Colors.primaryLight + "80",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  uploadTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  uploadSubTitle: { marginTop: 4, fontSize: 13, color: Colors.textSecondary },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    color: Colors.text,
  },
  mediaCard: {
    width: "31%",
    aspectRatio: 1,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: { width: "100%", height: "100%" },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: Colors.primaryLight + "50",
    justifyContent: "center",
    alignItems: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: { paddingHorizontal: 20, paddingBottom: 25, paddingTop: 10 },
});
