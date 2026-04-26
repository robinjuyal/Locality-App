package com.locality.app.repository;

import com.locality.app.entity.LedgerEntry;
import com.locality.app.entity.Wallet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    Page<LedgerEntry> findByWalletOrderByCreatedAtDesc(Wallet wallet, Pageable pageable);
}
