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
    View
} from 'react-native';

interface CheckupScheduleModalProps {
  isVisible: boolean;
  onClose: () => void;
  petData?: any;
  onSave: (data: any) => void;
}

interface CheckupItem {
  id: string;
  note: string;
  date: Date;
}

export default function CheckupScheduleModal({ isVisible, onClose, petData, onSave }: CheckupScheduleModalProps) {
  // State for the checkup list
  const [checkupSchedule, setCheckupSchedule] = useState<CheckupItem[]>([]);
  
  // State for the new checkup being added
  const [newCheckup, setNewCheckup] = useState({
    note: '',
    date: new Date(),
  });
  
  // State to manage date picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);

  // Sử dụng useEffect để cập nhật checkupSchedule khi petData thay đổi
  useEffect(() => {
    if (petData && petData.checkupSchedule) {
      const formattedCheckups = petData.checkupSchedule.map((item: any) => ({
        id: item.id || Math.random().toString(),
        note: item.note || "",
        date: item.date ? new Date(item.date) : new Date()
      }));
      setCheckupSchedule(formattedCheckups);
      console.log("CheckupScheduleModal - Dữ liệu nhận được:", petData.checkupSchedule);
    }
  }, [petData, isVisible]);

  const handleSave = () => {
    onSave({
      checkupSchedule: checkupSchedule
    });
    onClose();
  };

  const addCheckup = () => {
    if (newCheckup.note.trim() === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung tái khám');
      return;
    }

    if (isEditing && editIndex >= 0) {
      // Update existing checkup
      const updatedSchedule = [...checkupSchedule];
      updatedSchedule[editIndex] = {
        ...updatedSchedule[editIndex],
        note: newCheckup.note,
        date: newCheckup.date
      };
      setCheckupSchedule(updatedSchedule);
      setIsEditing(false);
      setEditIndex(-1);
    } else {
      // Add new checkup
      setCheckupSchedule([
        ...checkupSchedule, 
        { 
          id: Math.random().toString(),
          note: newCheckup.note, 
          date: newCheckup.date 
        }
      ]);
    }

    // Reset form
    setNewCheckup({
      note: '',
      date: new Date(),
    });
  };

  const editCheckup = (index: number) => {
    setIsEditing(true);
    setEditIndex(index);
    const item = checkupSchedule[index];
    setNewCheckup({
      note: item.note,
      date: item.date,
    });
  };

  const deleteCheckup = (index: number) => {
    const updatedSchedule = [...checkupSchedule];
    updatedSchedule.splice(index, 1);
    setCheckupSchedule(updatedSchedule);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewCheckup({ ...newCheckup, date: selectedDate });
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
              <Text style={styles.title}>Lịch tái khám</Text>
              <Text style={styles.subtitle}>Quản lý lịch tái khám của thú cưng</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Add New Checkup Section */}
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>
                {isEditing ? 'Cập nhật lịch tái khám' : 'Thêm lịch tái khám mới'}
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nội dung tái khám</Text>
                <TextInput
                  style={styles.input}
                  value={newCheckup.note}
                  onChangeText={(text) => setNewCheckup({ ...newCheckup, note: text })}
                  placeholder="Nhập nội dung tái khám"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ngày tái khám</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={toggleDatePicker}
                >
                  <AntDesign name="calendar" size={20} color="#479696" style={{ marginRight: 10 }} />
                  <Text style={styles.dateButtonText}>
                    {format(newCheckup.date, "dd/MM/yyyy", { locale: vi })}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={newCheckup.date}
                    mode="date"
                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={addCheckup}
              >
                <Text style={styles.addButtonText}>
                  {isEditing ? 'Cập nhật' : 'Thêm lịch tái khám'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity 
                  style={styles.cancelEditButton} 
                  onPress={() => {
                    setIsEditing(false);
                    setEditIndex(-1);
                    setNewCheckup({ note: '', date: new Date() });
                  }}
                >
                  <Text style={styles.cancelEditButtonText}>Hủy cập nhật</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Checkup Schedule List */}
            <View style={styles.scheduleSection}>
              <Text style={styles.sectionTitle}>Danh sách lịch tái khám</Text>
              
              {checkupSchedule.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có lịch tái khám nào</Text>
              ) : (
                checkupSchedule.map((item, index) => (
                  <View key={index} style={styles.checkupItem}>
                    <View style={styles.checkupInfo}>
                      <Text style={styles.checkupNote}>{item.note}</Text>
                      <Text style={styles.checkupDate}>
                        {format(new Date(item.date), "dd/MM/yyyy", { locale: vi })}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => editCheckup(index)}
                        style={styles.editButton}
                      >
                        <AntDesign name="edit" size={20} color="#479696" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => deleteCheckup(index)}
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
    height: 50,
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
    backgroundColor: '#479696',
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
  scheduleSection: {
    marginBottom: 20,
  },
  checkupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  checkupInfo: {
    flex: 1,
  },
  checkupNote: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 14,
    color: '#666',
  },
  checkupDate: {
    fontFamily: Fonts.SFProText.semibold,
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
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
    backgroundColor: '#479696',
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