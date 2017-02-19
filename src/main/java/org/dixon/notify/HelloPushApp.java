package org.dixon.notify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Sample app for using ELK stack for storage and presentation of REST API audit
 *
 * @author dickson
 */
@SpringBootApplication
@EnableJpaAuditing
public class HelloPushApp {

  public static void main(String[] args) throws Exception {
    SpringApplication.run(HelloPushApp.class, args);
  }

}
