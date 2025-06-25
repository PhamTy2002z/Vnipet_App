import { Fonts } from '@/constants/Fonts';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface BasicInfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  petData?: any;
  onSave: (data: any) => void;
}

export default function BasicInfoModal({ isVisible, onClose, petData, onSave }: BasicInfoModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    birthDate: null as Date | null,
    description: "",
  });

  useEffect(() => {
    if (petData) {
      setFormData({
        name: petData.name || "",
        species: petData.species || "",
        birthDate: petData.birthDate ? new Date(petData.birthDate) : null,
        description: petData.description || "",
      });
      console.log("BasicInfoModal - Dữ liệu nhận được:", petData);
    }
  }, [petData, isVisible]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, birthDate: selectedDate });
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
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
              <Text style={styles.title}>Thông tin cơ bản</Text>
              <Text style={styles.subtitle}>Cập nhật thông tin cơ bản của thú cưng</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Pet Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên thú cưng *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nhập tên thú cưng"
              />
            </View>

            {/* Species */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Loài *</Text>
              <TextInput
                style={styles.input}
                value={formData.species}
                onChangeText={(text) => setFormData({ ...formData, species: text })}
                placeholder="Nhập loài thú cưng (VD: Mèo, Chó, Hamster...)"
              />
            </View>

            {/* Birth Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày sinh</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={toggleDatePicker}
              >
                <AntDesign name="calendar" size={20} color="#595085" style={{ marginRight: 10 }} />
                <Text style={styles.dateButtonText}>
                  {formData.birthDate
                    ? format(formData.birthDate, "dd/MM/yyyy", { locale: vi })
                    : "Chọn ngày sinh"}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <View>
                  <DateTimePicker
                    value={formData.birthDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    style={{width: Platform.OS === 'ios' ? '100%' : 'auto'}}
                  />
                  
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosButtonContainer}>
                      <TouchableOpacity 
                        style={styles.iosButton} 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.iosButtonText}>Xác nhận</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={styles.textarea}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Mô tả về tính cách, sở thích của thú cưng..."
                multiline
                numberOfLines={5}
              />
              <Text style={styles.charCount}>{formData.description.length}/500 ký tự</Text>
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
              style={[
                styles.saveButton,
                (!formData.name || !formData.species) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!formData.name || !formData.species}
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
    fontFamily: Fonts.SFProDisplay.semibold,
    fontSize: 18,
    color: '#000',
  },
  subtitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
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
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.SFProText.regular,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    height: 50,
  },
  dateButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: '#333',
    fontSize: 16,
  },
  textarea: {
    fontFamily: Fonts.SFProText.regular,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
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
    fontFamily: Fonts.SFProText.medium,
    color: '#333',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5A5A5',
  },
  saveButtonText: {
    fontFamily: Fonts.SFProText.medium,
    color: 'white',
    fontSize: 16,
  },
  iosButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  iosButton: {
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iosButtonText: {
    fontFamily: Fonts.SFProText.medium,
    color: 'white',
    fontSize: 14,
  },
}); 