package com.locality.app.repository;

import com.locality.app.entity.Room;
import com.locality.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByName(String name);
    List<Room> findByType(String type);

    @Query("SELECT r FROM Room r JOIN r.members m WHERE m = :user AND r.type IN ('DIRECT','GROUP')")
    List<Room> findRoomsByMember(@Param("user") User user);

    Optional<Room> findByNameAndType(String name, String type);
}
