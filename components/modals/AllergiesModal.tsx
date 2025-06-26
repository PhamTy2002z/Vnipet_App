import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface AllergiesModalProps {
  isVisible: boolean;
  onClose: () => void;
  petData?: any;
  onSave: (data: any) => void;
}

interface AllergyItem {
  id: string;
  name: string;
  notes: string;
}

export default function AllergiesModal({ isVisible, onClose, petData, onSave }: AllergiesModalProps) {
  // State for the allergies list
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  
  // State for the new allergy being added
  const [newAllergy, setNewAllergy] = useState({
    name: '',
    notes: '',
  });
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);

  // Sử dụng useEffect để cập nhật allergies khi petData thay đổi
  useEffect(() => {
    if (petData && petData.allergies) {
      const formattedAllergies = petData.allergies.map((item: any) => ({
        id: item.id || Math.random().toString(),
        name: item.name || "",
        notes: item.notes || ""
      }));
      setAllergies(formattedAllergies);
      console.log("AllergiesModal - Dữ liệu nhận được:", petData.allergies);
    }
  }, [petData, isVisible]);

  const handleSave = () => {
    onSave({
      allergies: allergies
    });
    onClose();
  };

  const addAllergy = () => {
    if (newAllergy.name.trim() === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập tên chất dị ứng');
      return;
    }

    if (isEditing && editIndex >= 0) {
      // Update existing allergy
      const updatedAllergies = [...allergies];
      updatedAllergies[editIndex] = {
        ...updatedAllergies[editIndex],
        name: newAllergy.name,
        notes: newAllergy.notes
      };
      setAllergies(updatedAllergies);
      setIsEditing(false);
      setEditIndex(-1);
    } else {
      // Add new allergy
      setAllergies([
        ...allergies, 
        { 
          id: Math.random().toString(),
          name: newAllergy.name, 
          notes: newAllergy.notes 
        }
      ]);
    }

    // Reset form
    setNewAllergy({
      name: '',
      notes: '',
    });
  };

  const editAllergy = (index: number) => {
    setIsEditing(true);
    setEditIndex(index);
    const item = allergies[index];
    setNewAllergy({
      name: item.name,
      notes: item.notes,
    });
  };

  const deleteAllergy = (index: number) => {
    const updatedAllergies = [...allergies];
    updatedAllergies.splice(index, 1);
    setAllergies(updatedAllergies);
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
              <Text style={styles.title}>Dị ứng</Text>
              <Text style={styles.subtitle}>Quản lý thông tin dị ứng của thú cưng</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            {/* Add New Allergy Section */}
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>
                {isEditing ? 'Cập nhật thông tin dị ứng' : 'Thêm thông tin dị ứng mới'}
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên chất dị ứng</Text>
                <TextInput
                  style={styles.input}
                  value={newAllergy.name}
                  onChangeText={(text) => setNewAllergy({ ...newAllergy, name: text })}
                  placeholder="Nhập tên chất dị ứng"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                  style={styles.textarea}
                  value={newAllergy.notes}
                  onChangeText={(text) => setNewAllergy({ ...newAllergy, notes: text })}
                  placeholder="Nhập ghi chú về dị ứng..."
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={addAllergy}
              >
                <Text style={styles.addButtonText}>
                  {isEditing ? 'Cập nhật' : 'Thêm dị ứng'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity 
                  style={styles.cancelEditButton} 
                  onPress={() => {
                    setIsEditing(false);
                    setEditIndex(-1);
                    setNewAllergy({ name: '', notes: '' });
                  }}
                >
                  <Text style={styles.cancelEditButtonText}>Hủy cập nhật</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Allergies List */}
            <View style={styles.allergySection}>
              <Text style={styles.sectionTitle}>Danh sách dị ứng</Text>
              
              {allergies.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có thông tin dị ứng nào</Text>
              ) : (
                allergies.map((item, index) => (
                  <View key={index} style={styles.allergyItem}>
                    <View style={styles.allergyInfo}>
                      <Text style={styles.allergyName}>{item.name}</Text>
                      {item.notes ? (
                        <Text style={styles.allergyNotes}>{item.notes}</Text>
                      ) : null}
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => editAllergy(index)}
                        style={styles.editButton}
                      >
                        <Ionicons name="pencil" size={20} color="#C93F8D" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => deleteAllergy(index)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontFamily: Fonts.SFProDisplay.medium,
    fontSize: 18,
    color: '#333333',
  },
  subtitle: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
  closeButton: {
    padding: 5,
  },
  formContent: {
    padding: 20,
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#333333',
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
  textarea: {
    fontFamily: Fonts.SFProText.regular,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#C93F8D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: 'white',
    fontSize: 14,
  },
  allergyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FDF9FB',
    borderRadius: 12,
    marginBottom: 12,
  },
  allergyInfo: {
    flex: 1,
  },
  allergyName: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  allergyNotes: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C93F8D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontFamily: Fonts.SFProText.regular,
    color: '#C93F8D',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#C93F8D',
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
  addSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.SFProText.medium,
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
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
  allergySection: {
    marginBottom: 20,
  },
  emptyText: {
    fontFamily: Fonts.SFProText.regular,
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
}); 