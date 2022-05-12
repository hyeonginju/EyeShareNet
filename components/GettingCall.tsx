import { View, Text, StyleSheet, Image } from "react-native";
import React from "react";
import Button from "./Button";

interface Props {
  hangup: () => void;
  join: () => void;
}

export default function GettingCall(props: Props) {
  return (
    <View style={styles.container}>
      <Image source={require("../img/catcat.jpg")} style={styles.image} />
      <View style={styles.bContainer}>
        <Button
          iconName=""
          backgrounColor=""
          onPress={props.hangup}
          style={{ marginLeft: 30 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  image: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  bContainer: {},
});
