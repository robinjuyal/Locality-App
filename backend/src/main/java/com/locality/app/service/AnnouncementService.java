package com.locality.app.service;

import com.locality.app.dto.*;
import com.locality.app.entity.*;
import com.locality.app.exception.AppException;
import com.locality.app.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final UserService userService;

    @Transactional
    public AnnouncementDto create(CreateAnnouncementRequest req, String adminPhone) {
        User admin = userService.getEntityByPhone(adminPhone);
        Announcement announcement = Announcement.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .tag(req.getTag() != null ? req.getTag() : "GENERAL")
                .urgent(req.isUrgent())
                .postedBy(admin)
                .build();
        return toDto(announcementRepository.save(announcement));
    }

    public Page<AnnouncementDto> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return announcementRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toDto);
    }

    public List<AnnouncementDto> getUrgent() {
        return announcementRepository.findByUrgentTrueOrderByCreatedAtDesc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<AnnouncementDto> getByTag(String tag) {
        return announcementRepository.findByTagOrderByCreatedAtDesc(tag)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void delete(Long id) {
        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new AppException("Announcement not found"));
        announcementRepository.delete(a);
    }

    private AnnouncementDto toDto(Announcement a) {
        return AnnouncementDto.builder()
                .id(a.getId())
                .title(a.getTitle())
                .content(a.getContent())
                .tag(a.getTag())
                .urgent(a.isUrgent())
                .postedBy(AuthService.toUserDto(a.getPostedBy()))
                .createdAt(a.getCreatedAt())
                .build();
    }
}
