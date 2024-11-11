// Kết nối đến server socket
const socket = io('/')

// Lấy phần tử videoGrid từ HTML để hiển thị video của các user
const videoGrid = document.getElementById('videoGrid')

// Tạo phần tử video cho video của người dùng hiện tại và tắt tiếng
const myVideo = document.createElement('video')
myVideo.muted = true // Đảm bảo video của người dùng không phát âm thanh cho chính mình

// Tạo một Peer mới để quản lý kết nối ngang hàng (P2P)
var peer = new Peer()

// Cấu hình Peer với đường dẫn và cổng kết nối đến PeerJS server
const myPeer = new Peer(undefined, {
	path: '/peerjs',
	host: '/',
	port: '5000',
})

var curCamera = false;
var curMic = false;
var link_ava = "https://i.pinimg.com/564x/21/0a/76/210a7677d78d6dcedccbf1c543aa7ebf.jpg";

// Khởi tạo một object để lưu trữ các peer của những người dùng khác khi kết nối
const peers = {}
let myVideoStream // Biến lưu trữ stream video của người dùng

// Lấy quyền truy cập vào video và âm thanh của người dùng từ thiết bị
navigator.mediaDevices
	.getUserMedia({
		video: true, // Yêu cầu quyền truy cập video
		audio: true, // Yêu cầu quyền truy cập âm thanh
	})
	.then((stream) => {
		// Lưu trữ stream video của người dùng hiện tại
		myVideoStream = stream
		// Hiển thị video của người dùng lên giao diện
		addVideoStream(myVideo, stream)

		// Khi có người dùng mới kết nối, gọi hàm để kết nối với người dùng mới đó
		socket.on('user-connected', (userId) => {
			connectToNewUser(userId, stream) // Kết nối với người dùng mới
			alert('Somebody connected', userId) // Hiển thị thông báo khi có người kết nối
		})

		// Khi có cuộc gọi từ người dùng khác
		peer.on('call', (call) => {
			// Trả lời cuộc gọi bằng stream của người dùng hiện tại
			call.answer(stream)
			const video = document.createElement('video')
			call.on('stream', (userVideoStream) => {
				// Hiển thị video của người dùng khác lên giao diện
				addVideoStream(video, userVideoStream)
			})
		})

		// Lấy phần tử input để gửi tin nhắn
		let text = $('input')

		// Lắng nghe sự kiện nhấn phím enter để gửi tin nhắn qua socket
		$('html').keydown(function (e) {
			if (e.which == 13 && text.val().length !== 0) { // Kiểm tra nếu enter được nhấn và input không trống
				socket.emit('message', text.val()) // Gửi tin nhắn đến server
				text.val('') // Xóa nội dung trong input sau khi gửi
			}
		})

		// Khi nhận được tin nhắn từ server, hiển thị tin nhắn lên giao diện
		socket.on('createMessage', (message, userId) => {
			$('ul').append(`<li >
								<span class="messageHeader">
									<span>
										From 
										<span class="messageSender">Someone</span> 
										to 
										<span class="messageReceiver">Everyone:</span>
									</span>

									${new Date().toLocaleString('en-US', {
										hour: 'numeric',
										minute: 'numeric',
										hour12: true,
									})}
								</span>

								<span class="message">${message}</span>
							
							</li>`)
			scrollToBottom() // Cuộn xuống cuối danh sách tin nhắn
		})
	})

// Khi người dùng ngắt kết nối, đóng kết nối peer của họ
socket.on('user-disconnected', (userId) => {
	if (peers[userId]) peers[userId].close()
})

// Khi peer của người dùng mở kết nối, tham gia vào phòng
peer.on('open', (id) => {
	socket.emit('join-room', ROOM_ID, id) // Thông báo người dùng đã tham gia phòng
})

// Kết nối với người dùng mới và bắt đầu stream video của họ
const connectToNewUser = (userId, stream) => {
	const call = peer.call(userId, stream) // Bắt đầu cuộc gọi với userId và stream
	const video = document.createElement('video')
	call.on('stream', (userVideoStream) => {
		addVideoStream(video, userVideoStream) // Hiển thị video của người dùng khác lên giao diện
	})
	call.on('close', () => {
		video.remove() // Xóa video của người dùng khi họ rời khỏi phòng
	})

	peers[userId] = call // Lưu trữ cuộc gọi của người dùng vào object peers
}

// Thêm video stream vào giao diện
const addVideoStream = (video, stream) => {
	video.srcObject = stream // Đặt stream làm nguồn cho video
	video.addEventListener('loadedmetadata', () => {
		video.play() // Phát video khi dữ liệu đã sẵn sàng
	})
	videoGrid.append(video) // Thêm video vào videoGrid trong giao diện
}

// Cuộn xuống cuối phần chat
const scrollToBottom = () => {
	var d = $('.mainChatWindow')
	d.scrollTop(d.prop('scrollHeight'))
}

// Bật/tắt mic của người dùng
const muteUnmute = () => {
	const enabled = myVideoStream.getAudioTracks()[0].enabled
	if (enabled) {
		myVideoStream.getAudioTracks()[0].enabled = false // Tắt mic
		setUnmuteButton() // Cập nhật giao diện thành nút "Unmute"
	} else {
		setMuteButton() // Cập nhật giao diện thành nút "Mute"
		myVideoStream.getAudioTracks()[0].enabled = true // Bật mic
	}
}

// Cập nhật nút để hiển thị biểu tượng mic đang bật
const setMuteButton = () => {
	const html = `
	  <i class="fas fa-microphone"></i>
	  <span>Mute</span>
	`
	document.querySelector('.mainMuteButton').innerHTML = html
}

// Cập nhật nút để hiển thị biểu tượng mic đang tắt
const setUnmuteButton = () => {
	const html = `
	  <i class="unmute fas fa-microphone-slash"></i>
	  <span>Unmute</span>
	`
	document.querySelector('.mainMuteButton').innerHTML = html
}

// Bật/tắt video của người dùng
const playStop = () => {
	let enabled = myVideoStream.getVideoTracks()[0].enabled
	if (enabled) {
		myVideoStream.getVideoTracks()[0].enabled = false // Tắt video
		setPlayVideo() // Cập nhật giao diện thành nút "Play Video"
	} else {
		setStopVideo() // Cập nhật giao diện thành nút "Stop Video"
		myVideoStream.getVideoTracks()[0].enabled = true // Bật video
	}
}

// Cập nhật nút để hiển thị biểu tượng video đang bật
const setStopVideo = () => {
	const html = `
	  <i class="fas fa-video"></i>
	  <span>Stop Video</span>
	`
	document.querySelector('.mainVideoButton').innerHTML = html
}

// Cập nhật nút để hiển thị biểu tượng video đang tắt
const setPlayVideo = () => {
	const html = `
	<i class="stop fas fa-video-slash"></i>
	  <span>Play Video</span>
	`
	document.querySelector('.mainVideoButton').innerHTML = html
}
