package com.locality.app.websocket;

import com.locality.app.dto.*;
import com.locality.app.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final UserService userService;

    /**
     * Client sends to: /app/chat.send
     * Server broadcasts to: /topic/room.{roomId}
     */
    @MessageMapping("/chat.send")
    public void sendMessage(SendMessageRequest request, Principal principal) {
        try {
            UserDto sender = userService.getByPhone(principal.getName());
            MessageDto message = chatService.saveMessage(
                    request.getRoomId(),
                    sender.getId(),
                    request.getContent(),
                    request.getMediaUrl(),
                    request.getMessageType()
            );
            // Broadcast to all subscribers of this room
            messagingTemplate.convertAndSend("/topic/room." + request.getRoomId(), message);
            log.debug("Message sent to room {} by {}", request.getRoomId(), sender.getName());
        } catch (Exception e) {
            log.error("Error sending message", e);
        }
    }

    /**
     * Client sends to: /app/chat.typing
     * Server broadcasts to: /topic/room.{roomId}.typing
     */
    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEvent event, Principal principal) {
        UserDto user = userService.getByPhone(principal.getName());
        event.setUserName(user.getName());
        event.setUserId(user.getId());
        messagingTemplate.convertAndSend("/topic/room." + event.getRoomId() + ".typing", event);
    }
}
