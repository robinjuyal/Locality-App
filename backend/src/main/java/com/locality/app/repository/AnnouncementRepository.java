package com.locality.app.repository;

import com.locality.app.entity.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    Page<Announcement> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Announcement> findByTagOrderByCreatedAtDesc(String tag);
    List<Announcement> findByUrgentTrueOrderByCreatedAtDesc();
}
