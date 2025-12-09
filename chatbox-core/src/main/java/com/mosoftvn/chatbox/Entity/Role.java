package com.mosoftvn.chatbox.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "roles")
public class Role {
    // Getter & Setter thủ công
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name; // Ví dụ: ROLE_USER, ROLE_ADMIN

    // Constructor
    public Role() {}
    public Role(String name) { this.name = name; }

}