import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Button from "./components/Button";
import GettingCall from "./components/GettingCall";
import Video from "./components/Video";
import {
  MediaStream,
  EventOnAddStream,
  RTCPeerConnection,
} from "react-native-webrtc";
import Utils from "./components/Utils";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

const configuration = { iceServers: [{ url: "stun:stun.l.google.com:19302" }] };

export default function App() {
  const [localStream, setLocatStream] = useState<MediaStream | null>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>();
  const [gettingCall, setGettingCall] = useState(false);
  const pc = useRef<RTCPeerConnection>();
  const connecting = useRef(false);

  useEffect(() => {
    const cRef = firestore().collection("meet").doc("chatId");

    const subscribe = cRef.onSnapshot((snapshot) => {
      const data = snapshot.data();

      // On answer start the call
      if (pc.current && !pc.current.remoteDescription && data && data.answer) {
        pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      // If there is offer for the chatId set the getting call flag
      if (data && data.offer && !connecting.current) {
        setGettingCall(true);
      }
    });
    // On Delete of collection call hangup
    // The other side has click on hangup
    const subscribeDelete = cRef.collection("callee").onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type == "removed") {
          hangup();
        }
      });
    });
    return () => {
      subscribe();
      subscribeDelete();
    };
  }, []);

  const setupWebrtc = async () => {
    pc.current = new RTCPeerConnection(configuration);

    // Get the audio and video stream for the call
    const stream = await Utils.getStream();

    if (stream) {
      setLocatStream(stream);
      pc.current.addStream(stream);
    }

    // Get the remote stream once it is avalable
    pc.current.onaddstream = (event: EventOnAddStream) => {
      setRemoteStream(event.stream);
    };
  };
  const create = async () => {
    console.log("calling");
    connecting.current = true;

    // setUp webrtc
    await setupWebrtc();

    // Document for the call
    const cRef = firestore().collection("meet").doc("chatId");

    // Exchange the ICE candidate between the caller and callee
    collectIcecandidates(cRef, "caller", "callee");

    if (pc.current) {
      // Create the offer for the call
      // store the offer under the document
      const offer = await pc.current.createOffer();
      pc.current.setLocalDescription(offer);

      const cWithOffer = {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      };

      cRef.set(cWithOffer);
    }
  };
  const join = async () => {
    console.log("joining the call");
    connecting.current = true;
    setGettingCall(false);

    const cRef = firestore().collection("meet").doc("chatId");
    const offer = (await cRef.get()).data()?.offer;

    if (offer) {
      // Setup WebRTC
      await setupWebrtc();

      // Exchange the ICE candidates
      // Check the parameters, Its reversed. Since the joining part is callee
      collectIcecandidates(cRef, "callee", "caller");

      if (pc.current) {
        pc.current.setRemoteDescription(new RTCSessionDescription(offer));

        // Current the answer for the call
        // update the document with answer
        const answer = await pc.current.createAnswer();
        pc.current.setLocalDescription(answer);
        const cWithAnswer = {
          answer: {
            type: answer.type,
            sdp: answer.sdp,
          },
        };
        cRef.update(cWithAnswer);
      }
    }
  };

  // For disconnecting the call close the connection, release the stream
  // And delete the document for the call
  const hangup = async () => {
    setGettingCall(false);
    connecting.current = false;
    StreamCleanUp();
    firestoreCleanUp();
    if (pc.current) {
      pc.current.close();
    }
  };

  // Helper function
  const StreamCleanUp = async () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop);
      localStream.release();
    }
    setLocatStream(null);
    setRemoteStream(null);
  };
  const firestoreCleanUp = async () => {
    const cRef = firestore().collection("meet").doc("chatId");

    if (cRef) {
      const calleeCandidate = await cRef.collection("callee").get();
      calleeCandidate.forEach(async (candidate) => {
        await candidate.ref.delete();
      });
      const callerCandidate = await cRef.collection("callee").get();
      calleeCandidate.forEach(async (candidate) => {
        await candidate.ref.delete();
      });

      cRef.delete();
    }
  };

  const collectIcecandidates = async (
    cRef: FirebaseFirestoreTypes.DocumentRefernce<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string
  ) => {
    const candidateCollection = cRef.collection(localName);

    if (pc.current) {
      // On new ICE candidate add it to firestore
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          candidateCollection.add(event.candidate);
        }
      };
    }

    // Get the ICE candidate added to firestore and update the local pc
    cRef.collection(remoteName).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type == "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current?.addIceCandidate(candidate);
        }
      });
    });
  };

  // Display the gettingCall Component
  if (gettingCall) {
    return <GettingCall hangup={hangup} join={join} />;
  }

  // Display local stream on calling
  // Display both local and remote stream once call is connected

  if (localStream) {
    return (
      <Video
        hangup={hangup}
        localStream={localStream}
        remoteStream={remoteStream}
      />
    );
  }

  // Display the call button
  return (
    <View style={styles.container}>
      <Button iconName="video" backgrounColor="grey" onPress={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
