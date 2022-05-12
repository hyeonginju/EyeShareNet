import { View, StyleSheet } from "react-native";
import React from "react";
import { TouchableOpacity } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/FontAwesome5";

interface Props {
  onPress?: any;
  iconName: string;
  backgrounColor: string;
  style?: any;
}

export default function Button(props: Props) {
  return (
    <View>
      <TouchableOpacity
        onPress={props.onPress}
        style={[
          { backgroundColor: props.backgrounColor },
          props.style,
          styles.button,
        ]}
      >
        <Icon name={props.iconName} color="white" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    padding: 10,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
  },
});
