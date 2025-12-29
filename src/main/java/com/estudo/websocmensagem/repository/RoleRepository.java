package com.estudo.websocmensagem.repository;

import com.estudo.websocmensagem.entities.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Role findByName(String name);
}
