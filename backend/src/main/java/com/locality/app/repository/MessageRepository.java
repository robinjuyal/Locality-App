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

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByRoomOrderByCreatedAtAsc(Room room, Pageable pageable);

    List<Message> findByRoomAndPinnedTrueOrderByCreatedAtDesc(Room room);

    @Query("SELECT m FROM Message m WHERE m.room = :room AND " +
           "(LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%'))) AND m.deleted = false")
    List<Message> searchMessages(@Param("room") Room room, @Param("query") String query);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.room = :room AND m.deleted = false " +
           "AND m.sender.id != :userId AND (m.readBy IS NULL OR m.readBy NOT LIKE CONCAT('%,', :userId, ',%') " +
           "AND m.readBy NOT LIKE CONCAT(:userId, ',%') AND m.readBy NOT LIKE CONCAT('%,', :userId) AND m.readBy != CAST(:userId AS string))")
    long countUnreadMessages(@Param("room") Room room, @Param("userId") Long userId);
}
