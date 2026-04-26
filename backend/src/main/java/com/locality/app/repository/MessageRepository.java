package com.locality.app.repository;

import com.locality.app.entity.Message;
import com.locality.app.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    Page<Message> findByRoomOrderByCreatedAtAsc(Room room, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.room = :room AND m.read = false AND m.sender.id != :userId")
    long countUnreadMessages(@Param("room") Room room, @Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.read = true WHERE m.room = :room AND m.sender.id != :userId")
    void markRoomMessagesAsRead(@Param("room") Room room, @Param("userId") Long userId);
}
