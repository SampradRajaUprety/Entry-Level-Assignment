// Student-side typing box in ReactJS
class TypingBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: "",
      mqttClient: null,
      startTime: null,
      rollNo: null,
      name: null
    };
  }
  componentDidMount() {
    // Connect to the server using MQTT
    const mqttClient = mqtt.connect("mqtt://localhost:3000");
    this.setState({ mqttClient });
  }
  handleChange(event) {
    // Send each word to the server as the student types
    const text = event.target.value;
    this.setState({ text });
    const words = text.split(" ");
    for (const word of words) {
      // Calculate the elapsed time since the student started typing
      let elapsedTime = 0;
      if (this.state.startTime) {
        elapsedTime = Date.now() - this.state.startTime;
      } else {
        this.setState({ startTime: Date.now() });
      }
      // Send the word, elapsed time, and student data to the server
      this.state.mqttClient.publish("student_typing", JSON.stringify({
        rollNo: this.state.rollNo,
        name: this.state.name,
        word: word,
        elapsedTime: elapsedTime
      }));
    }
  }
  handleUpload(event) {
    // Upload the student's image to the server
    const image = event.target.files[0];
    this.state.mqttClient.publish("student_image", JSON.stringify({
      rollNo: this.state.rollNo,
      name: this.state.name,
      image: image
    }));
  }
  render() {
    return (
      <div>
        <input type="text" placeholder="Name" onChange={(event) => this.setState({ name: event.target.value })} />
        <input type="text" placeholder="Roll No." onChange={(event) => this.setState({ rollNo: event.target.value })} />
        <input type="text" onChange={this.handleChange.bind(this)} />
        <input type="file" onChange={this.handleUpload.bind(this)} />
        </div>
    );
  }
}

// Server-side MQTT connection in NodeJS
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:3000");

client.on("connect", function() {
  client.subscribe("student_typing");
  client.subscribe("student_image");
});

client.on("message", function(topic, message) {
  const data = JSON.parse(message);
  if (topic === "student_typing") {
    // Save the data to a Redis key-value pair database
    redisClient.hmset(data.rollNo, {
      name: data.name,
      rollNo: data.rollNo,
      words: data.words,
      elapsedTime: data.elapsedTime
    });
  } else if (topic === "student_image") {
    // Save the student's image to the server
    fs.writeFileSync(`images/${data.rollNo}.jpg`, data.image);
  }
});

// Teacher's dashboard in ReactJS
class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };
  }
  componentDidMount() {
    // Connect to the server using a WebSocket
    const websocket = new WebSocket("ws://localhost:3001");
    websocket.onmessage = function(event) {
      // Update the dashboard with the latest data
      this.setState({ data : event.data });
    }.bind(this);
    }
    render() {
    return (
    <table>
    <tr>
    <th>Roll No.</th>
    <th>Name</th>
    <th>Image</th>
    <th>Total Words</th>
    <th>Total Characters</th>
    <th>Words/Minute</th>
    <th>Characters/Minute</th>
    </tr>
    {this.state.data
    .sort((a, b) => b.wordsPerMinute - a.wordsPerMinute)
    .map(student => (
    <tr>
    <td>{student.rollNo}</td>
    <td>{student.name}</td>
    <td>
    <img src={'images/${student.rollNo}.jpg'} alt={student.name} />
    </td>
    <td>{student.totalWords}</td>
    <td>{student.totalCharacters}</td>
    <td>{student.wordsPerMinute}</td>
    <td>{student.charactersPerMinute}</td>
    </tr>
    ))}
    </table>
    );
    }
    }
    
    // Calculate the typing speed in words/minute and characters/minute
    function calculateTypingSpeed(elapsedTime, totalWords, totalCharacters) {
    const minutes = elapsedTime / 60000;
    return {
    wordsPerMinute: totalWords / minutes,
    charactersPerMinute: totalCharacters / minutes
    };
    }
