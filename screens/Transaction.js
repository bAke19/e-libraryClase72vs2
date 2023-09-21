import React, { Component } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  ToastAndroid
} from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import {getDoc, 
        doc, 
        collection, 
        query, 
        where, 
        getDocs, 
        updateDoc, 
        Timestamp, 
        addDoc, 
        increment } from 'firebase/firestore'
import db from '../config'

const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookId: "",
      studentId: "",
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      bookName: '',
      studentName: '',
    };
  }

  getCameraPermissions = async domState => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();

    this.setState({
      /*status === "granted" es true cuando el usuario ha concedido el permiso
          status === "granted" es false cuando el usuario no ha concedido el permiso
        */
      hasCameraPermissions: status === "granted",
      domState: domState,
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { domState } = this.state;

    if (domState === "bookId") {
      this.setState({
        bookId: data,
        domState: "normal",
        scanned: true
      });
    } else if (domState === "studentId") {
      this.setState({
        studentId: data,
        domState: "normal",
        scanned: true
      });
    }
  };

  handleTransaccion = async () =>{
    const {bookId, studentId} = this.state;

    const libro = doc(db, 'books', bookId)
    const docSnap = await getDoc(libro);

    await this.getBookDetails(bookId)
    await this.getStudentDetails(studentId)

    const {bookName, studentName} = this.state;

    if(docSnap.exists()){
      var documento = docSnap.data()

      if(documento.is_book_available){
        this.initiateBookIssue(bookId, studentId, bookName, studentName);
        ToastAndroid.show('Libro prestado al alumno', ToastAndroid.LONG);

      }else{
        this.initiateBookReturn(bookId, studentId, bookName, studentName);
        ToastAndroid.show('Se devolvio correctamente el libro', ToastAndroid.LONG)
      }
    }else {
      // docSnap.data() will be undefined in this case
      console.log("No such document!");
    }
  }

  getBookDetails = async bookId => {
    bookId = bookId.trim();

    const bookRef = collection(db, "books");
// Create a query against the collection.
  	const q = query(bookRef, where("book_id", "==",  bookId));
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      this.setState({
        bookName: doc.data().book_details.book_name
      });
    });
    
  };

  getStudentDetails = async studentId => {
    studentId = studentId.trim();

    const bookRef = collection(db, "students");
// Create a query against the collection.
  	const q = query(bookRef, where("student_id", "==", studentId));
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      // doc.data() is never undefined for query doc snapshots
      //console.log(doc.id, " => ", doc.data());
      this.setState({
        studentName: doc.data().student_details.student_name
      });
    });
  };

  initiateBookIssue = async (bookId, studentId, bookName, studentName) => {

    const docRef = await addDoc(collection(db, 'transactions'), {
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: Timestamp.now().toDate(),
      transaction_type: 'prestamo'
    });

    await updateDoc(doc(db, 'students', studentId),{
      number_of_books_issued: increment(1)
    });

    await updateDoc(doc(db, 'books', bookId),{
      is_book_available: false
    });

    this.setState({
      bookId: '',
      studentId: ''
    });

  }

  initiateBookReturn = async (bookId, studentId, bookName, studentName) => {

    const docRef = await addDoc(collection(db, 'transactions'), {
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: Timestamp.now().toDate(),
      transaction_type: 'devolucion'
    });

    await updateDoc(doc(db, 'students', studentId),{
      number_of_books_issued: increment(-1)
    });

    await updateDoc(doc(db, 'books', bookId),{
      is_book_available: true
    });

    this.setState({
      bookId: '',
      studentId: ''
    });
  }

  render() {
    const { bookId, studentId, domState, scanned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon} />
            <Image source={appName} style={styles.appName} />
          </View>
          <View style={styles.lowerContainer}>
            <View style={styles.textinputContainer}>
              <TextInput
                style={styles.textinput}
                placeholder={"Id del libro"}
                placeholderTextColor={"#FFFFFF"}
                value={bookId}
                onChangeText={bookId => this.setState({bookId: bookId})}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("bookId")}
              >
                <Text style={styles.scanbuttonText}>Escanear</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.textinputContainer, { marginTop: 25 }]}>
              <TextInput
                style={styles.textinput}
                placeholder={"Id del alumno"}
                placeholderTextColor={"#FFFFFF"}
                value={studentId}
                onChangeText={studentId => this.setState({studentId: studentId})}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("studentId")}
              >
                <Text style={styles.scanbuttonText}>Escanear</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={this.handleTransaccion}
              style={[styles.button,{marginTop:25}]}>
              <Text style={styles.buttonText}>
                Enviar
              </Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 80,
    height: 80,
    resizeMode: "contain"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 24,
    color: "#0A0101",
    fontFamily: "Rajdhani_600SemiBold"
  },
  button:{
    width: '43%',
    height:55,
    justifyContent: 'center',
    alignItems:'center',
    backgroundColor:'#f48d20',
    borderRadius: 15
  } ,
  buttonText:{
    color: '#ffffff',
    fontFamily: 'Rajdhani_600SemiBold'
  }
});
