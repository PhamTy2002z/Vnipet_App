import { Fonts } from '@/constants/Fonts';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface VaccinationHistoryModalProps {
  isVisible: boolean;
  onClose: () => void;
  petData?: any;
  onSave: (data: any) => void;
}

interface VaccinationItem {
  id: string;
  name: string;
  date: Date;
}

export default function VaccinationHistoryModal({ isVisible, onClose, petData, onSave }: VaccinationHistoryModalProps) {
  // State for the vaccinations list
  const [vaccinationHistory, setVaccinationHistory] = useState<VaccinationItem[]>([]);
  
  // State for the new vaccination being added
  const [newVaccination, setNewVaccination] = useState({
    name: '',
    date: new Date(),
  });
  
  // State to manage date picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);

  // Sử dụng useEffect để cập nhật vaccinationHistory khi petData thay đổi
  useEffect(() => {
    if (petData && petData.vaccinationHistory) {
      const formattedHistory = petData.vaccinationHistory.map((item: any) => ({
        id: item.id || Math.random().toString(),
        name: item.name || "",
        date: item.date ? new Date(item.date) : new Date()
      }));
      setVaccinationHistory(formattedHistory);
      console.log("VaccinationHistoryModal - Dữ liệu nhận được:", petData.vaccinationHistory);
    }
  }, [petData, isVisible]);

  const handleSave = () => {
    onSave({
      vaccinationHistory: vaccinationHistory
    });
    onClose();
  };

  const addVaccination = () => {
    if (newVaccination.name.trim() === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập tên vắc xin');
      return;
    }

    if (isEditing && editIndex >= 0) {
      // Update existing vaccination
      const updatedHistory = [...vaccinationHistory];
      updatedHistory[editIndex] = {
        ...updatedHistory[editIndex],
        name: newVaccination.name,
        date: newVaccination.date
      };
      setVaccinationHistory(updatedHistory);
      setIsEditing(false);
      setEditIndex(-1);
    } else {
      // Add new vaccination
      setVaccinationHistory([
        ...vaccinationHistory, 
        { 
          id: Math.random().toString(),
          name: newVaccination.name, 
          date: newVaccination.date 
        }
      ]);
    }

    // Reset form
    setNewVaccination({
      name: '',
      date: new Date(),
    });
  };

  const editVaccination = (index: number) => {
    setIsEditing(true);
    setEditIndex(index);
    const item = vaccinationHistory[index];
    setNewVaccination({
      name: item.name,
      date: item.date,
    });
  };

  const deleteVaccination = (index: number) => {
    const updatedHistory = [...vaccinationHistory];
    updatedHistory.splice(index, 1);
    setVaccinationHistory(updatedHistory);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewVaccination({ ...newVaccination, date: selectedDate });
    }
  };

  // Toggle date picker visibility
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
              <Text style={styles.title}>Lịch sử tiêm chủng</Text>
              <Text style={styles.subtitle}>Quản lý lịch sử tiêm chủng của thú cưng</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Add New Vaccination Section */}
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>
                {isEditing ? 'Cập nhật mũi tiêm' : 'Thêm mũi tiêm mới'}
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên vắc xin</Text>
                <TextInput
                  style={styles.input}
                  value={newVaccination.name}
                  onChangeText={(text) => setNewVaccination({ ...newVaccination, name: text })}
                  placeholder="Nhập tên vắc xin"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ngày tiêm</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={toggleDatePicker}
                >
                  <AntDesign name="calendar" size={20} color="#4338CA" style={{ marginRight: 10 }} />
                  <Text style={styles.dateButtonText}>
                    {format(newVaccination.date, "dd/MM/yyyy", { locale: vi })}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={newVaccination.date}
                    mode="date"
                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={addVaccination}
              >
                <Text style={styles.addButtonText}>
                  {isEditing ? 'Cập nhật' : 'Thêm mũi tiêm'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity 
                  style={styles.cancelEditButton} 
                  onPress={() => {
                    setIsEditing(false);
                    setEditIndex(-1);
                    setNewVaccination({ name: '', date: new Date() });
                  }}
                >
                  <Text style={styles.cancelEditButtonText}>Hủy cập nhật</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Vaccination History List */}
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Danh sách các mũi tiêm</Text>
              
              {vaccinationHistory.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có lịch sử tiêm chủng</Text>
              ) : (
                vaccinationHistory.map((item, index) => (
                  <View key={index} style={styles.vaccinationItem}>
                    <View style={styles.vaccinationInfo}>
                      <Text style={styles.vaccinationName}>{item.name}</Text>
                      <Text style={styles.vaccinationDate}>
                        {format(new Date(item.date), "dd/MM/yyyy", { locale: vi })}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => editVaccination(index)}
                        style={styles.editButton}
                      >
                        <AntDesign name="edit" size={20} color="#4338CA" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => deleteVaccination(index)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF5648" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
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
    maxHeight: '70%',
  },
  addSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.SFProText.regular,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
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
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: 'white',
    fontSize: 14,
  },
  cancelEditButton: {
    backgroundColor: '#FF5648',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelEditButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: 'white',
    fontSize: 14,
  },
  historySection: {
    marginBottom: 20,
  },
  vaccinationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  vaccinationInfo: {
    flex: 1,
  },
  vaccinationName: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  vaccinationDate: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 11,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
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
  emptyText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
}); 