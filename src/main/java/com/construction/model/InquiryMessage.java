package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * A single message in a client inquiry conversation thread.
 * senderRole is either "CLIENT" or "CLIENT_MANAGER".
 */
@Entity
@Table(name = "inquiry_messages")
public class InquiryMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inquiry_id", nullable = false)
    private ClientInquiry inquiry;

    @Column(nullable = false, length = 30)
    private String senderRole;

    private String senderName;

    @Column(nullable = false, length = 4000)
    private String message;

    private LocalDateTime createdAt = LocalDateTime.now();

    public InquiryMessage() {
    }

    public InquiryMessage(ClientInquiry inquiry, String senderRole, String senderName, String message, LocalDateTime createdAt) {
        this.inquiry = inquiry;
        this.senderRole = senderRole;
        this.senderName = senderName;
        this.message = message;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ClientInquiry getInquiry() { return inquiry; }
    public void setInquiry(ClientInquiry inquiry) { this.inquiry = inquiry; }

    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
