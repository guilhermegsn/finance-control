import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TouchableWithoutFeedback, Image } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

interface SelectItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  image?: any;
}

interface SelectProps {
  items: SelectItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  backgroundColor?: string
  fontColor?: string
}

export const Select: React.FC<SelectProps> = ({
  items,
  selectedValue,
  onSelect,
  placeholder = 'Selecionar',
  disabled = false,
  label,
  backgroundColor,
  fontColor
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const theme = useTheme()

  const anchorRef = useRef<View>(null);

  const handleOpen = () => {
    if (disabled) return;

    // Tenta medir a posição do elemento
    if (anchorRef.current?.measureInWindow) {
      anchorRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({
          top: y + height,
          left: x,
          width: Math.max(width, 200), // Garante largura mínima
        });
        setModalVisible(true);
      });
    } else {
      // Fallback: usa posição padrão (centro da tela)
      setDropdownPosition({
        top: 200,
        left: 20,
        width: 300,
      });
      setModalVisible(true);
    }
  };

  const handleSelect = (value: string) => {
    onSelect(value);
    setModalVisible(false);
  };

  const selectedItem = items.find(item => item.value === selectedValue);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        ref={anchorRef}
        style={[styles.selectButton,
        { backgroundColor: backgroundColor },
        disabled && styles.disabled]}
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.7}
      >

        {selectedItem?.image && (
          <Image
            source={typeof selectedItem.image === 'string' ? { uri: selectedItem.image } : selectedItem.image}
            style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
          />
        )}

        {selectedItem?.icon && !selectedItem?.image && (
          <Icon source={selectedItem.icon} size={20} color={fontColor || theme.colors.onSurface} />
        )}

        <Text style={[styles.selectText, !selectedItem && styles.placeholderText,
        { color: fontColor || theme.colors.onSurface }]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Icon source="chevron-down" size={16} color={fontColor || theme.colors.onSurface} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[
              styles.dropdown,
              {
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }
            ]}>
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedValue === item.value && styles.selectedItem
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    {item.image && (
                      <Image 
                        source={typeof item.image === 'string' ? { uri: item.image } : item.image} 
                        style={styles.itemImage} 
                      />
                    )}
                    {item.icon && !item.image && (
                      <Icon source={item.icon} size={20} color="#333" />
                    )}
                    <Text style={[
                      styles.dropdownItemText,
                      selectedValue === item.value && styles.selectedItemText
                    ]}>
                      {item.label}
                    </Text>
                    {selectedValue === item.value && (
                      <Icon source="check" size={16} color="#2E9E57" />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 48,
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  selectText: {
    fontSize: 14,
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  selectedItem: {
    backgroundColor: '#f0f9f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectedItemText: {
    color: '#2E9E57',
    fontWeight: '600',
  },
  itemImage: {
    width: 20,
    height: 20,
    // borderRadius: 12,
  },
});
