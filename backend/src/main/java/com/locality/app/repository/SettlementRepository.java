package com.locality.app.repository;

import com.locality.app.entity.Settlement;
import com.locality.app.entity.User;
import com.locality.app.enums.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findByShopkeeperOrderByCreatedAtDesc(User shopkeeper);
    List<Settlement> findByStatusOrderByCreatedAtDesc(SettlementStatus status);
    List<Settlement> findBySettlementDateAndStatus(LocalDate date, SettlementStatus status);
    boolean existsByShopkeeperAndSettlementDate(User shopkeeper, LocalDate date);
}
