package policy

func LoadLocal(profile Profile) (Profile, error) {
	profile = ApplyDefaults(profile)
	if err := Validate(profile); err != nil {
		return Profile{}, err
	}
	return profile, nil
}
