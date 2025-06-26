import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface PreferencesModalProps {
  isVisible: boolean;
  onClose: () => void;
  petData?: any;
  onSave: (data: any) => void;
}

export default function PreferencesModal({
  isVisible,
  onClose,
  petData,
  onSave
}: PreferencesModalProps) {
  const [formData, setFormData] = useState({
    preferences: {
      favoriteFoods: [] as string[],
      favoriteShampoo: '',
      dailyRoutine: ''
    }
  });

  useEffect(() => {
    if (petData && petData.preferences) {
      setFormData({
        preferences: {
          favoriteFoods: petData.preferences.favoriteFoods || [],
          favoriteShampoo: petData.preferences.favoriteShampoo || '',
          dailyRoutine: petData.preferences.dailyRoutine || ''
        }
      });
      console.log("PreferencesModal - Dữ liệu nhận được:", petData.preferences);
    }
  }, [petData, isVisible]);

  const [foodInput, setFoodInput] = useState('');

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const addFood = () => {
    if (foodInput.trim()) {
      const updatedFoods = [...formData.preferences.favoriteFoods, foodInput.trim()];
      setFormData({
        ...formData,
        preferences: {
          ...formData.preferences,
          favoriteFoods: updatedFoods
        }
      });
      setFoodInput('');
    }
  };

  const removeFood = (index: number) => {
    const updatedFoods = [...formData.preferences.favoriteFoods];
    updatedFoods.splice(index, 1);
    setFormData({
      ...formData,
      preferences: {
        ...formData.preferences,
        favoriteFoods: updatedFoods
      }
    });
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Sở thích</Text>
              <Text style={styles.subtitle}>Quản lý sở thích của thú cưng</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Favorite Foods */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Thức ăn yêu thích</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.foodInput}
                  value={foodInput}
                  onChangeText={setFoodInput}
                  placeholder="Nhập thức ăn yêu thích"
                />
                <TouchableOpacity onPress={addFood} style={styles.addButton}>
                  <Text style={styles.addButtonText}>Thêm</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.foodList}>
                {formData.preferences.favoriteFoods.map((food, index) => (
                  <View key={index} style={styles.foodItem}>
                    <Text style={styles.foodItemText}>{food}</Text>
                    <TouchableOpacity onPress={() => removeFood(index)}>
                      <Ionicons name="close-circle" size={22} color="#FF5648" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Favorite Shampoo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Sữa tắm yêu thích</Text>
              <TextInput
                style={styles.input}
                value={formData.preferences.favoriteShampoo}
                onChangeText={(text) => 
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      favoriteShampoo: text
                    }
                  })
                }
                placeholder="Nhập loại sữa tắm"
              />
            </View>

            {/* Daily Routine */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Thói quen hàng ngày</Text>
              <TextInput
                style={styles.textarea}
                value={formData.preferences.dailyRoutine}
                onChangeText={(text) => 
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      dailyRoutine: text
                    }
                  })
                }
                placeholder="Mô tả thói quen hàng ngày của thú cưng..."
                multiline
                numberOfLines={5}
              />
              <Text style={styles.charCount}>{formData.preferences.dailyRoutine.length}/500 ký tự</Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 16,
    color: '#000',
  },
  subtitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 5,
  },
  formContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.SFProText.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  textarea: {
    fontFamily: Fonts.SFProText.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  foodInput: {
    flex: 1,
    fontFamily: Fonts.SFProText.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: 'white',
    fontSize: 13,
  },
  foodList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  foodItemText: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 13,
    color: '#333',
    marginRight: 4,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: '#333',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: 'white',
    fontSize: 14,
  },
  charCount: {
    fontFamily: Fonts.SFProText.regular,
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
}); 