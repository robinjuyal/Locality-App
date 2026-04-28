package com.locality.app.websocket;

import com.locality.app.dto.*;
import com.locality.app.repository.UserRepository;
import com.locality.app.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final SimpMessagingTemplate messaging;
    private final ChatService chatService;
    private final UserService userService;
    private final UserRepository userRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(SendMessageRequest request, Principal principal) {
        try {
            UserDto sender = userService.getByPhone(principal.getName());
            MessageDto message = chatService.saveMessage(
                    request.getRoomId(), sender.getId(),
                    request.getContent(), request.getMediaUrl(),
                    request.getMessageType(), request.getReplyToId(),
                    Boolean.TRUE.equals(request.getForwarded()));
            messaging.convertAndSend("/topic/room." + request.getRoomId(), message);
        } catch (Exception e) {
            log.error("Error sending message", e);
        }
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEvent event, Principal principal) {
        UserDto user = userService.getByPhone(principal.getName());
        event.setUserName(user.getName());
        event.setUserId(user.getId());
        messaging.convertAndSend("/topic/room." + event.getRoomId() + ".typing", event);
    }

    @MessageMapping("/presence.online")
    public void setOnline(Principal principal) {
        try {
            UserDto user = userService.getByPhone(principal.getName());
            userRepository.updateOnlineStatus(user.getId(), true, LocalDateTime.now());
            messaging.convertAndSend("/topic/presence",
                    new PresenceEvent(user.getId(), user.getName(), true, LocalDateTime.now()));
        } catch (Exception e) { log.error("Presence error", e); }
    }

    @MessageMapping("/presence.offline")
    public void setOffline(Principal principal) {
        try {
            UserDto user = userService.getByPhone(principal.getName());
            userRepository.updateOnlineStatus(user.getId(), false, LocalDateTime.now());
            messaging.convertAndSend("/topic/presence",
                    new PresenceEvent(user.getId(), user.getName(), false, LocalDateTime.now()));
        } catch (Exception e) { log.error("Presence error", e); }
    }
}
