package com.locality.app.service;

import com.locality.app.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    public String storeFile(MultipartFile file, String subfolder) {
        try {
            Path uploadPath = Paths.get(uploadDir, subfolder).toAbsolutePath();
            Files.createDirectories(uploadPath);

            String extension = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID() + extension;
            Path target = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/" + subfolder + "/" + filename;
        } catch (IOException e) {
            log.error("Failed to store file", e);
            throw new AppException("Could not store file: " + e.getMessage());
        }
    }

    public void deleteFile(String fileUrl) {
        try {
            if (fileUrl == null) return;
            String relativePath = fileUrl.replace("/uploads/", "");
            Path path = Paths.get(uploadDir, relativePath).toAbsolutePath();
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", fileUrl);
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
